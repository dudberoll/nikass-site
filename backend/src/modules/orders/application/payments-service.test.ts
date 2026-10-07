import { expect, test } from 'bun:test'
import { orderTotalsSchema } from '@web-app-demo/contracts'

import { PaymentsService } from './payments-service'
import { OrderFailure, type CheckoutAttempt, type PaymentProvider, type PaymentStore, type ProviderPayment } from './ports'

const paymentId = '223e4567-e89b-12d3-a456-426614174000'
const attemptId = '123e4567-e89b-12d3-a456-426614174000'
const input = {
  cart: { version: 1 as const, items: [{ slug: 'station', sku: 'S1', quantity: 1 }] },
  customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Тест', consent: true as const },
  promoCode: '',
}
const row: CheckoutAttempt = {
  id: attemptId,
  cartToken: 'cart-token',
  input,
  totals: { currency: 'RUB' as const, items: [{ sku: 'S1', name: 'Station', quantity: 1, totalMinor: 2500 }], discountMinor: 0, shippingMinor: 0, totalMinor: 2500 },
  expiresAt: new Date(Date.now() + 60_000),
  state: 'quoted',
  orderNumber: null,
  paymentId: null,
  paymentState: 'not_started',
  fulfillmentState: 'not_started',
}

test('starts a hosted payment from server totals and reconciles a success', async () => {
  let providerPayment: ProviderPayment = { id: paymentId, status: 'pending', paid: false, test: true, amount: { value: '25.00', currency: 'RUB' }, confirmationUrl: 'https://yoomoney.ru/checkout/test', metadata: { attemptId } }
  const calls: Partial<Parameters<PaymentProvider['create']>[0]> = {}
  const provider: PaymentProvider = {
    create: async (value) => { Object.assign(calls, value); return providerPayment },
    get: async () => providerPayment,
  }
  const store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> } = {
    find: async () => row,
    findByPaymentId: async (id) => id === row.paymentId ? row : null,
    findById: async (id) => id === row.id ? row : null,
    attachPayment: async (_id, id, state) => { row.paymentId = id; row.paymentState = state },
    recordPayment: async (_id, id, state) => { row.paymentId = id; row.paymentState = state; if (state === 'succeeded') row.fulfillmentState = 'queued' },
    claimFulfillment: async () => false,
    finishFulfillment: async () => undefined,
    failFulfillment: async () => undefined,
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined })

  expect(await service.start('checkout-token')).toEqual({ paymentId, confirmationUrl: 'https://yoomoney.ru/checkout/test', attemptId })
  expect(calls.amountMinor).toBe(2500)
  expect(calls.customerEmail).toBe(input.customer.email)
  expect(calls.items).toEqual(orderTotalsSchema.parse(row.totals).items)
  expect(calls.idempotenceKey).toMatch(/^[a-f0-9]{64}$/)
  expect(calls.returnUrl).toBe(`http://localhost:4322/checkout#attempt=${attemptId}`)

  providerPayment = { ...providerPayment, status: 'succeeded', paid: true }
  expect(await service.status(paymentId)).toEqual({ paymentId, paymentState: 'succeeded', fulfillmentState: 'queued', orderNumber: null })
})

test('rejects a provider amount that differs from the quoted total', async () => {
  const provider: PaymentProvider = {
    create: async () => { throw new Error('not used') },
    get: async () => ({ id: paymentId, status: 'succeeded', paid: true, test: true, amount: { value: '24.99', currency: 'RUB' }, confirmationUrl: null, metadata: { attemptId } }),
  }
  const store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> } = {
    find: async () => row,
    findByPaymentId: async () => row,
    findById: async () => row,
    attachPayment: async () => undefined,
    recordPayment: async () => undefined,
    claimFulfillment: async () => false,
    finishFulfillment: async () => undefined,
    failFulfillment: async () => undefined,
  }

  await expect(new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined }).status(paymentId)).rejects.toThrow('Параметры платежа')
})

test('does not start hosted payment when the quoted product has since gone out of stock', async () => {
  const store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> } = {
    find: async () => ({ ...row, paymentId: null }), findByPaymentId: async () => null, findById: async () => null,
    attachPayment: async () => undefined, recordPayment: async () => undefined, claimFulfillment: async () => false,
    finishFulfillment: async () => undefined, failFulfillment: async () => undefined,
  }
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates++; throw new Error('must not create') }, get: async () => { throw new Error('not used') } }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, {
    assertInStock: async () => { throw new OrderFailure('invalid', 'Товара сейчас нет в наличии.') },
  })

  await expect(service.start('checkout-token')).rejects.toThrow('Товара сейчас нет в наличии.')
  expect(paymentCreates).toBe(0)
})

test('does not reopen an existing payment when its product has since gone out of stock', async () => {
  const providerPayment: ProviderPayment = { id: paymentId, status: 'pending', paid: false, test: true,
    amount: { value: '25.00', currency: 'RUB' }, confirmationUrl: 'https://yoomoney.ru/checkout/test', metadata: { attemptId } }
  const store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> } = {
    find: async () => ({ ...row, paymentId }), findByPaymentId: async () => row, findById: async () => row,
    attachPayment: async () => undefined, recordPayment: async () => undefined, claimFulfillment: async () => false,
    finishFulfillment: async () => undefined, failFulfillment: async () => undefined,
  }
  const provider: PaymentProvider = { create: async () => { throw new Error('not used') }, get: async () => providerPayment }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, {
    assertInStock: async () => { throw new OrderFailure('invalid', 'Товара сейчас нет в наличии.') },
  })

  await expect(service.start('checkout-token')).rejects.toThrow('Товара сейчас нет в наличии.')
})
