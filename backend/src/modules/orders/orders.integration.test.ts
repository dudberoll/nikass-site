import { afterAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { createPrisma } from '../../db'
import { createOrderStore } from './infrastructure/orders-store'
import { OrdersService } from './application/orders-service'
import type { OrderProvider } from './application/ports'
import { PaymentsService } from './application/payments-service'
import type { ProviderPayment } from './application/ports'

const url = process.env.TEST_DATABASE_URL
;(url ? describe : describe.skip)('orders persistence', () => {
  const db = createPrisma(url!)
  afterAll(() => db.$disconnect())
  test('concurrent unpaid submissions create one Woo order and only the configured email task', async () => {
    let writes = 0
    const totals = { currency: 'RUB' as const, items: [{ sku: 'S1', name: 'Station', quantity: 1, totalMinor: 100 }], totalMinor: 100, discountMinor: 0, shippingMinor: 0 as const }
    const provider: OrderProvider = { quote: async () => ({ cartToken: 'test-token', totals }), submit: async () => { writes++; return 'test-order' } }
    const service = new OrdersService(createOrderStore(db, true), provider)
    const quote = await service.quote({ cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 1 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'a@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Звонок', consent: true }, promoCode: '' })
    await Promise.all([service.submit(quote.checkoutToken), service.submit(quote.checkoutToken)])
    expect(writes).toBe(1)
    expect(await service.status(quote.checkoutToken)).toEqual({ state: 'confirmed', orderNumber: 'test-order' })
    expect(await db.taskOutbox.count({ where: { type: 'orders:notify' } })).toBe(1)
  })

  test('only verified payment and completed fulfillment queue one Telegram task without customer details', async () => {
    const store = createOrderStore(db, false)
    const totals = { currency: 'RUB' as const, items: [{ sku: 'S1', name: 'Station', quantity: 2, totalMinor: 25000 }], totalMinor: 25000, discountMinor: 0, shippingMinor: 0 as const }
    const service = new OrdersService(store, { quote: async () => ({ cartToken: 'test-cart', totals }), submit: async () => 'unused' })
    const quote = await service.quote({ cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 2 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: '', consent: true }, promoCode: '' })
    const row = (await store.find(createHash('sha256').update(quote.checkoutToken).digest('hex')))!
    const paymentId = randomUUID()
    let payment: ProviderPayment = { id: paymentId, status: 'pending', paid: false, test: true,
      amount: { value: '250.00', currency: 'RUB' }, metadata: { attemptId: row.id }, confirmationUrl: 'https://example.test/payment' }
    const payments = new PaymentsService(store, { create: async () => payment, get: async () => payment }, 'https://example.test/checkout', true)
    await payments.start(quote.checkoutToken)
    await payments.webhook({ type: 'notification', event: 'payment.succeeded', object: { id: paymentId, status: 'succeeded', paid: true } })
    expect((await store.findById(row.id))?.paymentState).toBe('pending')
    expect(await db.taskOutbox.count({ where: { dedupeKey: `${row.id}:telegram` } })).toBe(0)
    payment = { ...payment, status: 'succeeded', paid: true }
    await payments.webhook({ type: 'notification', event: 'payment.succeeded', object: { id: paymentId } })
    expect((await store.findById(row.id))?.fulfillmentState).toBe('queued')
    expect(await db.taskOutbox.count({ where: { dedupeKey: `${row.id}:telegram` } })).toBe(0)
    expect(await store.claimFulfillment(row.id)).toBe(true)
    await store.finishFulfillment(row.id, 'N-42', false)
    await store.finishFulfillment(row.id, 'N-42', false)
    const tasks = await db.taskOutbox.findMany({ where: { dedupeKey: `${row.id}:telegram` } })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.payload).toEqual({ id: row.id, channel: 'telegram' })
    expect((await store.findById(row.id))?.cartToken).toBeNull()
  })
})
