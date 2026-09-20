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

type Config = {
  apiUrl: string
  secretKey: string
  shopId: string
  timeoutMs: number
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
      throw new PaymentFailure(
        response.status === 404 ? 'not_found' : response.status < 500 ? 'invalid' : 'unavailable',
        response.status < 500 ? 'ЮKassa отклонила запрос на оплату.' : 'ЮKassa временно недоступна. Попробуйте ещё раз.',
      )
    }
    const parsed = providerPaymentSchema.safeParse(data)
    if (!parsed.success) throw new PaymentFailure('unavailable', 'ЮKassa вернула некорректный ответ.')
    return parsed.data
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
    create: async ({ amountMinor, description, idempotenceKey, metadata, returnUrl }) => {
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new PaymentFailure('invalid', 'Сумма заказа должна быть больше нуля.')
      }
      const payment = normalize(await request('/v3/payments', {
        method: 'POST',
        headers: { 'Idempotence-Key': idempotenceKey },
        body: JSON.stringify({
          amount: { value: (amountMinor / 100).toFixed(2), currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: returnUrl },
          description: description.slice(0, 128),
          metadata,
        }),
      }))
      if (!payment.confirmationUrl) throw new PaymentFailure('unavailable', 'ЮKassa не вернула ссылку на оплату.')
      return payment
    },
    get: async (paymentId) => normalize(await request(`/v3/payments/${encodeURIComponent(paymentId)}`)),
  }
}
