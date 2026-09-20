import type { OrderQuoteRequest, OrderResult, OrderTotals } from '@web-app-demo/contracts'

export class OrderFailure extends Error {
  constructor(readonly kind: 'invalid' | 'unavailable' | 'conflict' | 'not_found', message: string) { super(message) }
}
export type OrderProvider = {
  quote(input: OrderQuoteRequest): Promise<{ cartToken: string; totals: OrderTotals }>
  submit(cartToken: string, input: OrderQuoteRequest, totals: OrderTotals): Promise<string>
}
export type CheckoutAttempt = {
  id: string
  cartToken: string | null
  input: unknown
  totals: unknown
  expiresAt: Date
  state: OrderResult['state']
  orderNumber: string | null
  paymentId?: string | null
  paymentState?: PaymentState
  fulfillmentState?: FulfillmentState
}
export type OrderStore = {
  create(tokenHash: string, cartToken: string, input: OrderQuoteRequest, totals: OrderTotals, expiresAt: Date): Promise<void>
  find(tokenHash: string): Promise<CheckoutAttempt | null>
  claim(id: string, now: Date): Promise<boolean>
  finish(id: string, orderNumber: string): Promise<void>
  fail(id: string, state: 'uncertain' | 'rejected'): Promise<void>
}

export type PaymentState = 'not_started' | 'pending' | 'succeeded' | 'canceled'
export type FulfillmentState = 'not_started' | 'queued' | 'processing' | 'confirmed' | 'uncertain' | 'skipped'

export type ProviderPayment = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  paid: boolean
  test: boolean
  amount: { value: string; currency: 'RUB' }
  confirmationUrl: string | null
  metadata: { attemptId?: string }
}

export class PaymentFailure extends Error {
  constructor(readonly kind: 'invalid' | 'unavailable' | 'not_found' | 'conflict', message: string) { super(message) }
}

export type PaymentProvider = {
  create(input: { amountMinor: number; description: string; idempotenceKey: string; metadata: { attemptId: string }; returnUrl: string }): Promise<ProviderPayment>
  get(paymentId: string): Promise<ProviderPayment>
}

export type PaymentStore = {
  findByPaymentId(paymentId: string): Promise<CheckoutAttempt | null>
  findById(id: string): Promise<CheckoutAttempt | null>
  attachPayment(id: string, paymentId: string, state: PaymentState): Promise<void>
  recordPayment(id: string, paymentId: string, state: PaymentState): Promise<void>
  claimFulfillment(id: string): Promise<boolean>
  finishFulfillment(id: string, orderNumber: string | null, skipped: boolean): Promise<void>
  failFulfillment(id: string): Promise<void>
}

export type PaidOrderProvider = {
  submitPaid(cartToken: string, input: OrderQuoteRequest, totals: OrderTotals, paymentId: string): Promise<string>
}
