import { expect, test } from 'bun:test'
import type { BackendRuntime } from '../../../runtime'
import { loadEnv } from '../../../env'
import { deliverOrderNotification } from './notifications'

const id = '123e4567-e89b-12d3-a456-426614174000'
const customer = { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', deliveryMethod: 'delivery',
  region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '12', postcode: '123456',
  comment: 'Позвонить заранее https://example.test/private', consent: true }
const order = { state: 'confirmed', paymentState: 'succeeded', fulfillmentState: 'confirmed', orderNumber: 'N-42',
  input: { cart: { version: 1, items: [{ slug: 'station', sku: 'NS-31', quantity: 2 }] }, customer, promoCode: 'sale' },
  totals: { currency: 'RUB', items: [{ sku: 'NS-31', name: 'Станция NIKASS 300 Вт', quantity: 2, totalMinor: 25000 }],
    discountMinor: 1000, shippingMinor: 0, totalMinor: 25000 } }
const env = loadEnv({ DATABASE_URL: 'postgresql://localhost/test', JWT_SECRET: 'a'.repeat(32),
  ORDER_TELEGRAM_BOT_TOKEN: 'fake-test-token', ORDER_TELEGRAM_CHAT_ID: '-123456' })
const runtime = (row: unknown = order) => ({ env, prisma: { checkoutAttempt: { findUnique: async () => row } } }) as unknown as BackendRuntime

test('sends full paid order details only to the server-configured chat without formatting or previews', async () => {
  const signal = new AbortController().signal
  let message: Record<string, unknown> = {}
  await deliverOrderNotification({ id, channel: 'telegram' }, runtime(), signal, async (url, init) => {
    expect(url).toBe('https://api.telegram.org/botfake-test-token/sendMessage')
    expect(init.signal).toBe(signal)
    expect(init.redirect).toBe('error')
    message = JSON.parse(String(init.body))
    return Response.json({ ok: true })
  })
  expect(message.chat_id).toBe('-123456')
  expect(message.protect_content).toBe(true)
  expect(message.link_preview_options).toEqual({ is_disabled: true })
  expect(message.parse_mode).toBeUndefined()
  const text = String(message.text)
  for (const detail of ['Оплачен заказ NIKASS №N-42', 'Станция NIKASS 300 Вт', 'NS-31', '2 шт.', '250.00 ₽',
    customer.name, customer.phone, customer.email, customer.region, customer.city, customer.street,
    'д. 3', 'кв. 12', customer.postcode, customer.comment, 'СДЭК', 'sale']) expect(text).toContain(detail)
  expect(text).not.toContain('fake-test-token')
})

test('never sends customer details before both payment and WooCommerce fulfillment are confirmed', async () => {
  for (const row of [null, { ...order, state: 'quoted' }, ...['not_started', 'pending', 'canceled'].map((paymentState) => ({ ...order, paymentState })),
    ...['queued', 'processing', 'uncertain', 'skipped'].map((fulfillmentState) => ({ ...order, fulfillmentState })), { ...order, orderNumber: null }]) {
    let sent = false
    const outcome = await deliverOrderNotification({ id, channel: 'telegram' }, runtime(row), new AbortController().signal, async () => {
      sent = true
      return Response.json({ ok: true })
    })
    expect(outcome).toBe('skipped')
    expect(sent).toBe(false)
  }
})

test('delivers long orders completely in bounded Unicode-safe messages', async () => {
  const name = 'Станция 🔋'.repeat(900)
  const messages: string[] = []
  await deliverOrderNotification({ id, channel: 'telegram' }, runtime({ ...order,
    totals: { ...order.totals, items: [{ ...order.totals.items[0]!, name }] } }), new AbortController().signal, async (_url, init) => {
    const { text } = JSON.parse(String(init.body))
    expect([...text].length).toBeLessThanOrEqual(4096)
    expect(text.isWellFormed()).toBe(true)
    messages.push(text)
    return Response.json({ ok: true })
  })
  expect(messages.length).toBeGreaterThan(1)
  expect(messages.join('')).toContain(name)
  expect(messages.join('')).toContain(customer.comment)
})

test('Telegram failures stay retryable and never expose credentials or customer data', async () => {
  for (const reply of [Response.json({ ok: false }), Response.json({ ok: true }, { status: 500 }), new Response('invalid')]) {
    await expect(deliverOrderNotification({ id, channel: 'telegram' }, runtime(), new AbortController().signal,
      async () => reply)).rejects.toThrow(/^Telegram delivery failed$/)
  }
  await expect(deliverOrderNotification({ id, channel: 'telegram' }, runtime(), new AbortController().signal,
    async () => { throw new Error(`fake-test-token ${customer.email}`) })).rejects.toThrow(/^Telegram delivery failed$/)
})
