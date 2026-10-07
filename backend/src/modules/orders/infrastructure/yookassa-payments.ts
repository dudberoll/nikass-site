import { z } from 'zod'

import { PaymentFailure, type PaymentProvider, type ProviderPayment } from '../application/ports'

const providerPaymentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
  paid: z.boolean(),
  test: z.boolean(),
  amount: z.object({ value: z.string().regex(/^\d+\.\d{2}$/), currency: z.literal('RUB') }),
  confirmation: z.object({ confirmation_url: z.string().url() }).optional(),
  metadata: z.object({ attemptId: z.string().uuid().optional() }).passthrough().default({}),
}).passthrough()
const providerErrorSchema = z.object({ code: z.string().optional(), parameter: z.string().optional() }).passthrough()
const shopSchema = z.object({
  test: z.boolean(), status: z.string(),
  fiscalization: z.object({ enabled: z.boolean() }).passthrough().optional(),
  fiscalization_enabled: z.boolean().optional(),
}).passthrough()

type Config = {
  apiUrl: string
  secretKey: string
  shopId: string
  timeoutMs: number
  testMode: boolean
  receiptVatCode?: number
}

export function createYooKassaPayments(config: Config): PaymentProvider {
  const request = async (path: string, init: RequestInit = {}) => {
    let response: Response
    try {
      response = await fetch(new URL(path, `${config.apiUrl.replace(/\/$/, '')}/`), {
        ...init,
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${config.shopId}:${config.secretKey}`)}`,
          ...init.headers,
        },
        signal: AbortSignal.timeout(config.timeoutMs),
      })
    } catch {
      throw new PaymentFailure('unavailable', 'ЮKassa временно недоступна. Попробуйте ещё раз.')
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const error = providerErrorSchema.safeParse(data)
      console.error('YooKassa HTTP failure', {
        path: new URL(path, `${config.apiUrl.replace(/\/$/, '')}/`).pathname,
        status: response.status,
        code: error.success ? error.data.code ?? null : null,
        parameter: error.success ? error.data.parameter ?? null : null,
      })
      throw new PaymentFailure(
        response.status === 404 ? 'not_found' : response.status < 500 ? 'invalid' : 'unavailable',
        response.status < 500 ? 'ЮKassa отклонила запрос на оплату.' : 'ЮKassa временно недоступна. Попробуйте ещё раз.',
      )
    }
    return data
  }

  const requestPayment = async (path: string, init: RequestInit = {}) => {
    const parsed = providerPaymentSchema.safeParse(await request(path, init))
    if (!parsed.success) throw new PaymentFailure('unavailable', 'ЮKassa вернула некорректный ответ.')
    return parsed.data
  }

  const assertShopMode = async () => {
    const shop = shopSchema.safeParse(await request('/v3/me'))
    if (!shop.success) throw new PaymentFailure('unavailable', 'Не удалось проверить настройки магазина ЮKassa.')
    if (shop.data.status !== 'enabled') throw new PaymentFailure('invalid', 'Магазин ЮKassa не включён для приёма платежей.')
    if (shop.data.test !== config.testMode) {
      throw new PaymentFailure('invalid', config.testMode
        ? 'Тестовая оплата остановлена: сейчас подключён боевой магазин ЮKassa. Укажите реквизиты тестового магазина.'
        : 'Подключён тестовый магазин ЮKassa, а включён режим реальной оплаты.')
    }
    return shop.data
  }

  const normalize = (value: z.infer<typeof providerPaymentSchema>): ProviderPayment => ({
    id: value.id,
    status: value.status,
    paid: value.paid,
    test: value.test,
    amount: value.amount,
    confirmationUrl: value.confirmation?.confirmation_url ?? null,
    metadata: value.metadata,
  })

  return {
    create: async ({ amountMinor, description, idempotenceKey, metadata, returnUrl, customerEmail, items }) => {
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new PaymentFailure('invalid', 'Сумма заказа должна быть больше нуля.')
      }
      const shop = await assertShopMode()
      let receipt
      if (shop.fiscalization?.enabled ?? shop.fiscalization_enabled ?? false) {
        const vatCode = config.receiptVatCode
        if (vatCode === undefined) throw new PaymentFailure('unavailable', 'Оплата временно недоступна: магазин ещё не настроил отправку чеков.')
        if (items.reduce((sum, item) => sum + item.totalMinor, 0) !== amountMinor) {
          throw new PaymentFailure('invalid', 'Сумма товаров не совпадает с суммой оплаты. Проверьте заказ заново.')
        }
        const receiptItems = items.flatMap((item) => {
          const unitMinor = Math.floor(item.totalMinor / item.quantity)
          const remainder = item.totalMinor % item.quantity
          // Split rounded unit prices so coupons never change the receipt's total by a kopeck.
          return [[item.quantity - remainder, unitMinor], [remainder, unitMinor + 1]]
            .filter(([quantity, minor]) => quantity > 0 && minor > 0)
            .map(([quantity, minor]) => ({
              description: Array.from(item.name).slice(0, 128).join(''), quantity,
              amount: { value: (minor / 100).toFixed(2), currency: 'RUB' },
              vat_code: vatCode, payment_mode: 'full_prepayment', payment_subject: 'commodity', measure: 'piece',
            }))
        })
        if (receiptItems.length > 80) throw new PaymentFailure('invalid', 'В заказе слишком много позиций для чека. Разделите заказ на несколько покупок.')
        receipt = { customer: { email: customerEmail }, items: receiptItems, internet: true }
      }
      const payment = normalize(await requestPayment('/v3/payments', {
        method: 'POST',
        headers: { 'Idempotence-Key': idempotenceKey },
        body: JSON.stringify({
          amount: { value: (amountMinor / 100).toFixed(2), currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: returnUrl },
          description: description.slice(0, 128),
          metadata,
          ...(receipt ? { receipt } : {}),
        }),
      }))
      if (!payment.confirmationUrl) throw new PaymentFailure('unavailable', 'ЮKassa не вернула ссылку на оплату.')
      return payment
    },
    get: async (paymentId) => normalize(await requestPayment(`/v3/payments/${encodeURIComponent(paymentId)}`)),
  }
}
