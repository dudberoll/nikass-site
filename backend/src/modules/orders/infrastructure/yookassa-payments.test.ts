import { afterEach, expect, spyOn, test } from 'bun:test'

import { createYooKassaPayments } from './yookassa-payments'

const config = { apiUrl: 'https://api.yookassa.test', shopId: '123', secretKey: 'fixture-key', timeoutMs: 1000, testMode: false, receiptVatCode: 7 }
const input = { amountMinor: 10000, description: 'Fixture order', idempotenceKey: 'fixture-attempt',
  metadata: { attemptId: '123e4567-e89b-12d3-a456-426614174000' }, returnUrl: 'https://example.test/checkout',
  customerEmail: 'buyer@example.test', items: [{ sku: 'S1', name: 'Station', quantity: 3, totalMinor: 10000 }] }
let fetchMock: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>
afterEach(() => fetchMock?.mockRestore())

test('sends an email receipt with exact discounted totals, unit prices and configured VAT', async () => {
  let paymentBody: Record<string, unknown> = {}
  fetchMock = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (!init?.body) return Response.json({ test: false, status: 'enabled', fiscalization: { enabled: true, provider: 'yoo_receipt' } })
    paymentBody = JSON.parse(String(init.body))
    return Response.json({ id: '223e4567-e89b-12d3-a456-426614174000', status: 'pending', paid: false, test: false,
      amount: paymentBody.amount, confirmation: { confirmation_url: 'https://example.test/pay' }, metadata: input.metadata })
  }, { preconnect: () => undefined }))
  await createYooKassaPayments(config).create(input)
  expect(paymentBody.receipt).toEqual({ customer: { email: input.customerEmail }, internet: true,
    items: [
      { description: 'Station', quantity: 2, amount: { value: '33.33', currency: 'RUB' }, vat_code: 7, payment_mode: 'full_prepayment', payment_subject: 'commodity', measure: 'piece' },
      { description: 'Station', quantity: 1, amount: { value: '33.34', currency: 'RUB' }, vat_code: 7, payment_mode: 'full_prepayment', payment_subject: 'commodity', measure: 'piece' },
    ] })
  expect(paymentBody.amount).toEqual({ value: '100.00', currency: 'RUB' })
})

test('does not guess VAT or send a payment when fiscalization requires an unconfigured receipt', async () => {
  fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ test: false, status: 'enabled', fiscalization: { enabled: true, provider: 'yoo_receipt' } }))
  await expect(createYooKassaPayments({ ...config, receiptVatCode: undefined }).create(input)).rejects.toThrow('чеков')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('keeps shops without fiscalization working without sending a receipt', async () => {
  let paymentBody: Record<string, unknown> = {}
  fetchMock = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (!init?.body) return Response.json({ test: false, status: 'enabled', fiscalization: { enabled: false } })
    paymentBody = JSON.parse(String(init.body))
    return Response.json({ id: '223e4567-e89b-12d3-a456-426614174000', status: 'pending', paid: false, test: false,
      amount: paymentBody.amount, confirmation: { confirmation_url: 'https://example.test/pay' }, metadata: input.metadata })
  }, { preconnect: () => undefined }))
  await createYooKassaPayments({ ...config, receiptVatCode: undefined }).create(input)
  expect(paymentBody.receipt).toBeUndefined()
})

test('rejects mismatched receipt totals and the provider item limit before creating a payment', async () => {
  for (const value of [
    { ...input, amountMinor: 10001 },
    { ...input, amountMinor: 410000, items: Array.from({ length: 41 }, (_, i) => ({ ...input.items[0], sku: String(i) })) },
  ]) {
    fetchMock = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(async () => Response.json({ test: false, status: 'enabled', fiscalization: { enabled: true } }), { preconnect: () => undefined }))
    await expect(createYooKassaPayments(config).create(value)).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.mockRestore()
  }
})
