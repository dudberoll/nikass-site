import { expect, test } from 'bun:test'

import type { DbClient } from '../../../db'
import { createOrderStore } from './orders-store'

test('unpaid orders only queue email when enabled, never a Telegram notification', async () => {
  for (const emailEnabled of [false, true]) {
    const channels: string[] = []
    const db = {
      $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
        checkoutAttempt: { update: async () => undefined },
        taskOutbox: {
          createMany: async ({ data }: { data: Array<{ payload: { channel: string } }> }) => {
            channels.push(...data.map((task) => task.payload.channel))
            return { count: data.length }
          },
          findUniqueOrThrow: async () => ({ id: 'task-id' }),
        },
      }),
    } as unknown as DbClient

    await createOrderStore(db, emailEnabled).finish('order-id', 'N-1')

    expect(channels).toEqual(emailEnabled ? ['email'] : [])
  }
})

test('queues paid-order notifications only after a successful fulfillment transition', async () => {
  for (const emailEnabled of [false, true]) {
    const tasks: Array<{ payload: { id: string; channel: string } }> = []
    let updated = 1
    const db = {
      $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
        checkoutAttempt: { updateMany: async ({ where }: { where: Record<string, unknown> }) => {
          expect(where).toEqual({ id: 'order-id', fulfillmentState: 'processing', paymentState: 'succeeded' })
          return { count: updated }
        } },
        taskOutbox: {
          createMany: async ({ data }: { data: typeof tasks }) => { tasks.push(...data); return { count: data.length } },
          findUniqueOrThrow: async () => ({ id: 'task-id' }),
        },
      }),
    } as unknown as DbClient
    const store = createOrderStore(db, emailEnabled)
    await store.finishFulfillment('order-id', 'N-42', false)
    expect(tasks.map((task) => task.payload)).toEqual((emailEnabled ? ['email', 'telegram'] : ['telegram'])
      .map((channel) => ({ id: 'order-id', channel })))
    updated = 0
    await store.finishFulfillment('order-id', 'N-42', false)
    expect(tasks).toHaveLength(emailEnabled ? 2 : 1)
    await store.finishFulfillment('order-id', null, true)
    expect(tasks).toHaveLength(emailEnabled ? 2 : 1)
  }
})
