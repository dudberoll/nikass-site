import { expect, test } from 'bun:test'
import { orderCustomerSchema, orderQuoteRequestSchema } from './orders'
const customer = { name: 'Анна Иванова', phone: '8 (999) 123-45-67', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Позвонить перед доставкой', consent: true }
test('order fields normalize phone and reject missing consent, invalid contacts and client totals', () => {
  expect(orderCustomerSchema.parse(customer).phone).toBe('+79991234567')
  for (const invalid of [{ consent: false }, { phone: '123' }, { email: 'a' }, { city: ' ' }, { house: '' }, { postcode: '123' }, { comment: '' }]) {
    expect(orderCustomerSchema.safeParse({ ...customer, ...invalid }).success).toBe(false)
  }
  expect(orderQuoteRequestSchema.safeParse({ customer, cart: { version: 1, items: [{ slug: 'a', sku: 'a', quantity: 1 }] }, promoCode: '', total: 1 }).success).toBe(false)
})
