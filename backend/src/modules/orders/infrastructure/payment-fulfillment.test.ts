import { expect, test } from 'bun:test'
import type { BackendRuntime } from '../../../runtime'
import { TerminalTaskError } from '../../../outbox'
import { fulfillPayment } from './payment-fulfillment'

test('does not repeat paid order creation for a legacy attempt whose fulfillment already started', async () => {
  const id = '123e4567-e89b-12d3-a456-426614174000'
  const updates: unknown[] = []
  const runtime = {
    env: {},
    prisma: {
      checkoutAttempt: {
        findUnique: async () => ({ id, paymentState: 'succeeded', fulfillmentState: 'processing', wooOrderId: null, cartToken: 'old-cart', paymentId: 'payment-id' }),
        updateMany: async (args: unknown) => { updates.push(args); return { count: 1 } },
      },
    },
  } as unknown as BackendRuntime

  await expect(fulfillPayment({ id }, runtime, new AbortController().signal)).rejects.toThrow(TerminalTaskError)
  expect(updates).toEqual([{
    where: { id, fulfillmentState: 'processing' },
    data: { fulfillmentState: 'uncertain' },
  }])
})
