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
}
export type OrderStore = {
  create(tokenHash: string, cartToken: string, input: OrderQuoteRequest, totals: OrderTotals, expiresAt: Date): Promise<void>
  find(tokenHash: string): Promise<CheckoutAttempt | null>
  claim(id: string, now: Date): Promise<boolean>
  finish(id: string, orderNumber: string): Promise<void>
  fail(id: string, state: 'uncertain' | 'rejected'): Promise<void>
}
