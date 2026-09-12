import type { DbClient } from '../../../db'
import { enqueueTask } from '../../../outbox'
import type { OrderStore } from '../application/ports'

export function createOrderStore(db: DbClient): OrderStore {
  return {
    create: async (tokenHash, cartToken, input, totals, expiresAt) => {
      await db.checkoutAttempt.create({ data: { tokenHash, cartToken, input, totals, expiresAt } })
    },
    find: (tokenHash) => db.checkoutAttempt.findUnique({ where: { tokenHash } }),
    claim: async (id, now) => (await db.checkoutAttempt.updateMany({
      where: { id, state: 'quoted', expiresAt: { gt: now } }, data: { state: 'submitting' },
    })).count === 1,
    finish: async (id, orderNumber) => {
      await db.$transaction(async (tx) => {
        await tx.checkoutAttempt.update({ where: { id }, data: { state: 'confirmed', orderNumber, cartToken: null } })
        for (const channel of ['email', 'telegram']) {
          await enqueueTask(tx, { type: 'orders:notify', dedupeKey: `${id}:${channel}`, payload: { id, channel } })
        }
      })
    },
    fail: async (id, state) => { await db.checkoutAttempt.update({ where: { id }, data: { state } }) },
  }
}
