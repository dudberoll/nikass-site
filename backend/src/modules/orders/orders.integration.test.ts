import { afterAll, describe, expect, test } from 'bun:test'
import { createPrisma } from '../../db'
import { createOrderStore } from './infrastructure/orders-store'
import { OrdersService } from './application/orders-service'
import type { OrderProvider } from './application/ports'

const url = process.env.TEST_DATABASE_URL
;(url ? describe : describe.skip)('orders persistence', () => {
  const db = createPrisma(url!)
  afterAll(() => db.$disconnect())
  test('concurrent submissions create one Woo order and one durable task per channel', async () => {
    let writes = 0
    const totals = { currency: 'RUB' as const, items: [{ sku: 'S1', name: 'Station', quantity: 1, totalMinor: 100 }], totalMinor: 100, discountMinor: 0, shippingMinor: 0 as const }
    const provider: OrderProvider = { quote: async () => ({ cartToken: 'test-token', totals }), submit: async () => { writes++; return 'test-order' } }
    const service = new OrdersService(createOrderStore(db), provider)
    const quote = await service.quote({ cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 1 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'a@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Звонок', consent: true }, promoCode: '' })
    await Promise.all([service.submit(quote.checkoutToken), service.submit(quote.checkoutToken)])
    expect(writes).toBe(1)
    expect(await service.status(quote.checkoutToken)).toEqual({ state: 'confirmed', orderNumber: 'test-order' })
    expect(await db.taskOutbox.count({ where: { type: 'orders:notify' } })).toBe(2)
  })
})
