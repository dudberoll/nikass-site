import { expect, test } from 'bun:test'

import type { DbClient } from '../../../db'
import { createOrderStore } from './orders-store'

test('queues Telegram for every order and email only when enabled', async () => {
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

    expect(channels).toEqual(emailEnabled ? ['email', 'telegram'] : ['telegram'])
  }
})
