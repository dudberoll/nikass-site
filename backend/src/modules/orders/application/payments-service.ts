import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  orderQuoteRequestSchema,
  orderTotalsSchema,
  type OrderQuoteRequest,
  type PaymentStatusResponse,
} from '@web-app-demo/contracts'

import { OrderFailure, PaymentFailure, type CheckoutAttempt, type OrderProvider, type PaymentOrderProvider, type PaymentProvider, type PaymentStore, type PaymentState } from './ports'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const paymentRetryDelayMs = 10 * 60_000
const paymentIdempotencyWindowMs = 24 * 60 * 60_000
const paymentIdempotencySafetyMarginMs = 60 * 60_000
const paymentRetryWindowMs = paymentIdempotencyWindowMs - paymentIdempotencySafetyMarginMs
const paymentState = (payment: Awaited<ReturnType<PaymentProvider['get']>>): PaymentState =>
  payment.status === 'succeeded' && payment.paid ? 'succeeded' : payment.status === 'canceled' ? 'canceled' : 'pending'

export class PaymentsService {
  constructor(
    private readonly store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> },
    private readonly provider: PaymentProvider,
    private readonly returnUrl: string,
    private readonly testMode: boolean,
    private readonly orders: Pick<OrderProvider, 'assertInStock'> & Partial<PaymentOrderProvider>,
    private readonly reserveWooOrderBeforePayment = false,
  ) {}

  async start(token: string) {
    let row = await this.findByToken(token)
    const input = orderQuoteRequestSchema.parse(row.input)
    if (row.state === 'rejected' || row.paymentState === 'canceled') {
      throw new PaymentFailure('conflict', 'Заказ или платёж уже отклонён. Создайте новый расчёт.')
    }
    if (row.paymentId) {
      const current = await this.provider.get(row.paymentId)
      const updated = await this.reconcile(row, current)
      if (current.status === 'pending' && current.confirmationUrl && updated.paymentState === 'pending') {
        if (updated.wooOrderId) await this.assertWooOrderCanBePaid(updated, input)
        else await this.assertInStock(input)
        return { paymentId: updated.paymentId!, confirmationUrl: current.confirmationUrl, attemptId: row.id }
      }
      throw new PaymentFailure('conflict', 'Платёж уже начат. Обновите статус оплаты.')
    }

    const totals = orderTotalsSchema.parse(row.totals)
    if (totals.totalMinor <= 0) throw new PaymentFailure('invalid', 'Заказ на нулевую сумму не требует онлайн-оплаты.')

    if (!row.wooOrderId) {
      if (row.state !== 'quoted') throw new PaymentFailure('conflict', 'Заказ уже обрабатывается. Обновите статус заказа.')
      if (row.expiresAt.getTime() <= Date.now()) throw new PaymentFailure('conflict', 'Расчёт устарел. Проверьте заказ заново.')
      if (!row.cartToken) throw new PaymentFailure('conflict', 'Корзина недоступна. Проверьте заказ заново.')
      await this.assertInStock(input)

      if (this.reserveWooOrderBeforePayment) {
        if (!this.orders.createPaymentOrder) throw new PaymentFailure('unavailable', 'Создание заказа WooCommerce перед оплатой не настроено.')
        if (!await this.store.claimPaymentOrder(row.id, new Date())) {
          row = await this.store.findById(row.id) ?? row
          if (!row.wooOrderId) throw new PaymentFailure('conflict', 'Заказ уже оформляется. Обновите статус заказа.')
        } else {
          try {
            const order = await this.orders.createPaymentOrder(row.cartToken, input, totals)
            await this.store.savePaymentOrder(row.id, order)
            row = { ...row, state: 'submitting', wooOrderId: order.id, orderNumber: order.number, cartToken: null }
          } catch (error) {
            if (error instanceof OrderFailure) {
              await this.store.fail(row.id, error.kind === 'invalid' ? 'rejected' : 'uncertain')
              throw new PaymentFailure(error.kind === 'invalid' ? 'conflict' : 'unavailable', error.message)
            }
            // The remote order may exist. Keep the claimed state so a retry cannot create a second order.
            throw new PaymentFailure('unavailable', 'Результат создания заказа WooCommerce требует проверки. Не повторяйте оплату.')
          }
        }
      }
    }
    if (row.wooOrderId) await this.assertWooOrderCanBePaid(row, input)

    const now = new Date()
    const idempotencyBefore = new Date(now.getTime() - paymentRetryWindowMs)
    if (!await this.store.claimPaymentStart(row.id, now, new Date(now.getTime() - paymentRetryDelayMs), idempotencyBefore)) {
      const needsManualReconciliation = row.paymentState === 'uncertain'
        || (row.paymentState === 'creating' && row.paymentCreateStartedAt && row.paymentCreateStartedAt <= idempotencyBefore)
      throw new PaymentFailure('conflict', needsManualReconciliation
        ? 'Создание платежа требует сверки с менеджером. Не повторяйте оплату.'
        : 'Платёж уже создаётся или требует сверки. Обновите статус немного позже.')
    }
    return this.createPayment(row, input, totals)
  }

  async reconcilePending(now: Date) {
    const retryBefore = new Date(now.getTime() - paymentRetryDelayMs)
    const idempotencyBefore = new Date(now.getTime() - paymentRetryWindowMs)
    await this.store.expireUnpaidPaymentOrders(new Date(now.getTime() - paymentRetryDelayMs), 25)
    await this.store.expirePaymentStartClaims(idempotencyBefore)
    const attempts = await this.store.findPending(retryBefore, idempotencyBefore, 25)
    for (let index = 0; index < attempts.length; index += 5) {
      const batch = attempts.slice(index, index + 5)
      await Promise.all(batch.map(async (row) => {
        try {
          if (row.paymentId) await this.status(row.paymentId)
          else if (row.paymentState === 'creating') await this.retryPaymentCreation(row, now, retryBefore, idempotencyBefore)
        } catch (error) {
          console.error('Pending checkout payment reconciliation failed.', { attemptId: row.id, type: error instanceof Error ? error.name : typeof error })
        }
      }))
    }
  }

  async status(paymentId: string): Promise<PaymentStatusResponse> {
    const row = await this.store.findByPaymentId(paymentId)
    if (!row) throw new PaymentFailure('not_found', 'Платёж не найден.')
    const payment = await this.provider.get(paymentId)
    await this.reconcile(row, payment)
    const current = await this.store.findByPaymentId(paymentId)
    return this.view(paymentId, current ?? row)
  }

  async webhook(value: unknown) {
    let body: z.infer<typeof webhookSchema>
    try { body = webhookSchema.parse(value) } catch { throw new PaymentFailure('invalid', 'Некорректное уведомление ЮKassa.') }
    if (body.event === 'refund.succeeded') return { ignored: true }
    const payment = await this.provider.get(body.object.id)
    let row = await this.store.findByPaymentId(payment.id)
      ?? (payment.metadata.attemptId ? await this.store.findById(payment.metadata.attemptId) : null)
    if (!row) return { ignored: true }
    if (row.paymentId && row.paymentId !== payment.id) throw new PaymentFailure('invalid', 'Платёж не соответствует заказу.')
    if (!row.paymentId && !await this.store.attachPayment(row.id, payment.id)) {
      const current = await this.store.findById(row.id)
      if (!current || current.paymentId !== payment.id) return { ignored: true }
      row = current
    }
    await this.reconcile(row, payment)
    return { ignored: false }
  }

  private async reconcile(row: CheckoutAttempt, payment: Awaited<ReturnType<PaymentProvider['get']>>) {
    this.validatePayment(row, payment)
    await this.store.recordPayment(row.id, payment.id, paymentState(payment))
    return await this.store.findById(row.id) ?? row
  }

  private async retryPaymentCreation(row: CheckoutAttempt, now: Date, retryBefore: Date, idempotencyBefore: Date) {
    const input = orderQuoteRequestSchema.parse(row.input)
    const totals = orderTotalsSchema.parse(row.totals)
    if (row.wooOrderId) await this.assertWooOrderCanBePaid(row, input)
    else {
      if (!row.cartToken) throw new PaymentFailure('conflict', 'Корзина недоступна. Нужна ручная сверка платежа.')
      await this.assertInStock(input)
    }
    if (!await this.store.claimPaymentStart(row.id, now, retryBefore, idempotencyBefore)) return
    await this.createPayment(row, input, totals)
  }

  private async createPayment(row: CheckoutAttempt, input: OrderQuoteRequest, totals: ReturnType<typeof orderTotalsSchema.parse>) {
    const returnUrl = new URL(this.returnUrl)
    returnUrl.hash = new URLSearchParams({ attempt: row.id }).toString()

    let payment: Awaited<ReturnType<PaymentProvider['create']>>
    try {
      payment = await this.provider.create({
        amountMinor: totals.totalMinor,
        customerEmail: input.customer.email,
        items: totals.items,
        description: `NIKASS: ${totals.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}`,
        idempotenceKey: createHash('sha256').update(`nikass-payment:${row.id}`).digest('hex'),
        metadata: { attemptId: row.id },
        returnUrl: returnUrl.href,
      })
    } catch (error) {
      if (error instanceof PaymentFailure && error.paymentOutcome === 'not_created') await this.store.rejectPaymentStart(row.id)
      throw error
    }
    this.validatePayment(row, payment)
    if (!await this.store.attachPayment(row.id, payment.id)) {
      const current = await this.store.findById(row.id)
      if (!current || current.paymentId !== payment.id) throw new PaymentFailure('conflict', 'Платёж создан, но не удалось безопасно связать его с заказом. Нужна проверка менеджера.')
      row = current
    }
    const updated = await this.reconcile(row, payment)
    if (updated.paymentState !== 'pending') throw new PaymentFailure('conflict', 'Платёж уже завершён или требует сверки. Обновите статус оплаты.')
    if (!payment.confirmationUrl) throw new PaymentFailure('conflict', 'Платёж создан без ссылки на оплату. Обновите статус оплаты.')
    return { paymentId: payment.id, confirmationUrl: payment.confirmationUrl, attemptId: row.id }
  }

  private validatePayment(row: CheckoutAttempt, payment: Awaited<ReturnType<PaymentProvider['get']>>) {
    const totals = orderTotalsSchema.parse(row.totals)
    if (payment.id !== row.paymentId && row.paymentId !== null && row.paymentId !== undefined) throw new PaymentFailure('invalid', 'Идентификатор платежа не соответствует заказу.')
    if (payment.test !== this.testMode || payment.amount.currency !== 'RUB' || payment.amount.value !== (totals.totalMinor / 100).toFixed(2)) {
      throw new PaymentFailure('invalid', 'Параметры платежа не соответствуют заказу.')
    }
    if (payment.metadata.attemptId !== row.id) throw new PaymentFailure('invalid', 'Платёж не связан с заказом.')
    if (payment.status === 'succeeded' && !payment.paid) throw new PaymentFailure('invalid', 'ЮKassa вернула некорректный статус платежа.')
  }

  private async findByToken(token: string) {
    const row = await this.store.find(hash(token))
    if (!row) throw new PaymentFailure('not_found', 'Расчёт заказа не найден.')
    return row
  }

  private async assertInStock(input: OrderQuoteRequest) {
    try {
      await this.orders.assertInStock(input)
    } catch (error) {
      if (!(error instanceof OrderFailure)) throw error
      throw new PaymentFailure(error.kind === 'invalid' ? 'conflict' : 'unavailable', error.message)
    }
  }

  private async assertWooOrderCanBePaid(row: CheckoutAttempt, input: OrderQuoteRequest) {
    if (!row.wooOrderId || !this.orders.getPaymentOrder) throw new PaymentFailure('unavailable', 'Связанный заказ WooCommerce не настроен. Нужна проверка менеджера.')
    try {
      const order = await this.orders.getPaymentOrder(row.wooOrderId)
      const totals = orderTotalsSchema.parse(row.totals)
      const coupon = input.promoCode.trim().toLocaleLowerCase()
      const couponCodes = coupon ? [coupon] : []
      if (order.totalMinor !== totals.totalMinor || order.couponCodes.length !== couponCodes.length || couponCodes.some((code) => !order.couponCodes.includes(code))) {
        throw new PaymentFailure('conflict', 'Сумма или промокод заказа WooCommerce изменились. Проверьте заказ заново.')
      }
      if ((order.status !== 'on-hold' && order.status !== 'pending') || order.transactionId) {
        throw new PaymentFailure('conflict', 'Заказ WooCommerce больше не ожидает оплату. Обновите статус заказа.')
      }
    } catch (error) {
      if (error instanceof PaymentFailure) throw error
      if (error instanceof OrderFailure) throw new PaymentFailure('unavailable', error.message)
      throw error
    }
  }

  private view(paymentId: string, row: CheckoutAttempt): PaymentStatusResponse {
    return {
      paymentId,
      paymentState: row.paymentState === 'creating' || row.paymentState === 'uncertain' ? 'pending' : row.paymentState ?? 'pending',
      fulfillmentState: row.fulfillmentState ?? 'not_started',
      orderNumber: row.orderNumber,
    }
  }
}

const webhookSchema = z.object({
  type: z.literal('notification'),
  event: z.enum(['payment.waiting_for_capture', 'payment.succeeded', 'payment.canceled', 'refund.succeeded']),
  object: z.object({ id: z.string().uuid() }).passthrough(),
}).passthrough()
