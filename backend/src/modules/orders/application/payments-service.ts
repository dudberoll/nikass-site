import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  orderQuoteRequestSchema,
  orderTotalsSchema,
  type OrderQuoteRequest,
  type PaymentStatusResponse,
} from '@web-app-demo/contracts'

import { OrderFailure, PaymentFailure, type CheckoutAttempt, type OrderProvider, type PaymentProvider, type PaymentStore, type PaymentState } from './ports'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const paymentState = (payment: Awaited<ReturnType<PaymentProvider['get']>>): PaymentState =>
  payment.status === 'succeeded' && payment.paid ? 'succeeded' : payment.status === 'canceled' ? 'canceled' : 'pending'

export class PaymentsService {
  constructor(
    private readonly store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> },
    private readonly provider: PaymentProvider,
    private readonly returnUrl: string,
    private readonly testMode: boolean,
    private readonly orders: Pick<OrderProvider, 'assertInStock'>,
  ) {}

  async start(token: string) {
    const row = await this.findByToken(token)
    const input = orderQuoteRequestSchema.parse(row.input)
    if (row.paymentId) {
      const current = await this.provider.get(row.paymentId)
      await this.reconcile(row, current)
      if (current.status === 'pending' && current.confirmationUrl) {
        await this.assertInStock(input)
        return { paymentId: row.paymentId, confirmationUrl: current.confirmationUrl, attemptId: row.id }
      }
      throw new PaymentFailure('conflict', 'Платёж уже начат. Обновите статус оплаты.')
    }

    if (row.state !== 'quoted') throw new PaymentFailure('conflict', 'Заказ уже обрабатывается. Обновите статус заказа.')
    if (row.expiresAt.getTime() <= Date.now()) throw new PaymentFailure('conflict', 'Расчёт устарел. Проверьте заказ заново.')
    await this.assertInStock(input)
    const totals = orderTotalsSchema.parse(row.totals)
    if (totals.totalMinor <= 0) throw new PaymentFailure('invalid', 'Заказ на нулевую сумму не требует онлайн-оплаты.')
    const returnUrl = new URL(this.returnUrl)
    returnUrl.hash = new URLSearchParams({ attempt: row.id }).toString()

    const payment = await this.provider.create({
      amountMinor: totals.totalMinor,
      customerEmail: input.customer.email,
      items: totals.items,
      description: `NIKASS: ${totals.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}`,
      idempotenceKey: createHash('sha256').update(`nikass-payment:${row.id}`).digest('hex'),
      metadata: { attemptId: row.id },
      returnUrl: returnUrl.href,
    })
    this.validatePayment(row, payment)
    await this.store.attachPayment(row.id, payment.id, paymentState(payment))
    return { paymentId: payment.id, confirmationUrl: payment.confirmationUrl!, attemptId: row.id }
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
    const row = await this.store.findByPaymentId(payment.id)
      ?? (payment.metadata.attemptId ? await this.store.findById(payment.metadata.attemptId) : null)
    if (!row) return { ignored: true }
    if (row.paymentId && row.paymentId !== payment.id) throw new PaymentFailure('invalid', 'Платёж не соответствует заказу.')
    if (!row.paymentId) await this.store.attachPayment(row.id, payment.id, paymentState(payment))
    await this.reconcile(row, payment)
    return { ignored: false }
  }

  private async reconcile(row: CheckoutAttempt, payment: Awaited<ReturnType<PaymentProvider['get']>>) {
    this.validatePayment(row, payment)
    await this.store.recordPayment(row.id, payment.id, paymentState(payment))
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

  private view(paymentId: string, row: CheckoutAttempt): PaymentStatusResponse {
    return {
      paymentId,
      paymentState: row.paymentState ?? 'pending',
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
