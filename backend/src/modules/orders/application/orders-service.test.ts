import { expect, test } from 'bun:test'
import { OrdersService } from './orders-service'
import type { OrderStore, OrderProvider, CheckoutAttempt } from './ports'

test('a repeated or ambiguous submission never sends a second order', async () => {
  const row: CheckoutAttempt = { id: '1', cartToken: 'secret', input: { cart: { version: 1, items: [{ slug: 'p', sku: 'p', quantity: 1 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'a@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Звонок', consent: true }, promoCode: '' }, totals: { currency: 'RUB', items: [{ sku: 'p', name: 'Product', quantity: 1, totalMinor: 100 }], discountMinor: 0, shippingMinor: 0, totalMinor: 100 }, expiresAt: new Date(Date.now() + 60000), state: 'quoted', orderNumber: null }
  const store: OrderStore = { create: async () => {}, find: async () => row, claim: async () => { if (row.state !== 'quoted') return false; row.state = 'submitting'; return true }, finish: async (_, number) => { row.state = 'confirmed'; row.orderNumber = number }, fail: async (_, state) => { row.state = state } }
  let calls = 0
  const provider: OrderProvider = { quote: async () => { throw new Error() }, submit: async () => { calls++; throw new Error('network timeout') } }
  const service = new OrdersService(store, provider)
  expect((await service.submit('a'.repeat(64))).state).toBe('uncertain')
  expect((await service.submit('a'.repeat(64))).state).toBe('uncertain')
  expect(calls).toBe(1)
})
