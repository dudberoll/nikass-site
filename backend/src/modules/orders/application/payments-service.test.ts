import { expect, test } from 'bun:test'

import { PaymentsService } from './payments-service'
import type { CheckoutAttempt, PaymentProvider, PaymentStore, ProviderPayment } from './ports'

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
  const calls: { amountMinor?: number; idempotenceKey?: string; returnUrl?: string } = {}
  const provider: PaymentProvider = {
    create: async (value) => { calls.amountMinor = value.amountMinor; calls.idempotenceKey = value.idempotenceKey; calls.returnUrl = value.returnUrl; return providerPayment },
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
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true)

  expect(await service.start('checkout-token')).toEqual({ paymentId, confirmationUrl: 'https://yoomoney.ru/checkout/test' })
  expect(calls.amountMinor).toBe(2500)
  expect(calls.idempotenceKey).toMatch(/^[a-f0-9]{64}$/)
  expect(calls.returnUrl).toBe('http://localhost:4322/checkout')

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

  await expect(new PaymentsService(store, provider, 'http://localhost:4322/checkout', true).status(paymentId)).rejects.toThrow('Параметры платежа')
})
