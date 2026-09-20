import type { DbClient } from '../../../db'
import { enqueueTask } from '../../../outbox'
import type { OrderStore, PaymentState, PaymentStore } from '../application/ports'

export function createOrderStore(db: DbClient, emailEnabled: boolean): OrderStore & PaymentStore {
  return {
    create: async (tokenHash, cartToken, input, totals, expiresAt) => {
      await db.checkoutAttempt.create({ data: { tokenHash, cartToken, input, totals, expiresAt } })
    },
    find: (tokenHash) => db.checkoutAttempt.findUnique({ where: { tokenHash } }),
    claim: async (id, now) => (await db.checkoutAttempt.updateMany({
      where: { id, state: 'quoted', paymentState: 'not_started', expiresAt: { gt: now } }, data: { state: 'submitting' },
    })).count === 1,
    finish: async (id, orderNumber) => {
      await db.$transaction(async (tx) => {
        await tx.checkoutAttempt.update({ where: { id }, data: { state: 'confirmed', orderNumber, cartToken: null } })
        for (const channel of emailEnabled ? ['email', 'telegram'] : ['telegram']) {
          await enqueueTask(tx, { type: 'orders:notify', dedupeKey: `${id}:${channel}`, payload: { id, channel } })
        }
      })
    },
    fail: async (id, state) => { await db.checkoutAttempt.update({ where: { id }, data: { state } }) },
    findByPaymentId: (paymentId) => db.checkoutAttempt.findUnique({ where: { paymentId } }),
    findById: (id) => db.checkoutAttempt.findUnique({ where: { id } }),
    attachPayment: async (id, paymentId, state) => {
      await db.checkoutAttempt.updateMany({
        where: { id, paymentId: null },
        data: { paymentId, paymentState: state },
      })
    },
    recordPayment: async (id, paymentId, state: PaymentState) => {
      await db.$transaction(async (tx) => {
        await tx.checkoutAttempt.updateMany({
          where: { id, paymentId, paymentState: { not: 'succeeded' } },
          data: {
            paymentState: state,
            ...(state === 'succeeded' ? { fulfillmentState: 'queued' as const } : {}),
          },
        })
        if (state === 'succeeded') {
          await enqueueTask(tx, { type: 'payment:fulfill', dedupeKey: id, payload: { id } })
        }
      })
    },
    claimFulfillment: async (id) => (await db.checkoutAttempt.updateMany({
      where: { id, fulfillmentState: 'queued', paymentState: 'succeeded' },
      data: { fulfillmentState: 'processing' },
    })).count === 1,
    finishFulfillment: async (id, orderNumber, skipped) => {
      await db.$transaction(async (tx) => {
        const updated = await tx.checkoutAttempt.updateMany({
          where: { id, fulfillmentState: 'processing' },
          data: skipped
            ? { fulfillmentState: 'skipped' }
            : { fulfillmentState: 'confirmed', state: 'confirmed', orderNumber, cartToken: null },
        })
        if (!skipped && updated.count === 1) {
          for (const channel of emailEnabled ? ['email', 'telegram'] : ['telegram']) {
            await enqueueTask(tx, { type: 'orders:notify', dedupeKey: `${id}:${channel}`, payload: { id, channel } })
          }
        }
      })
    },
    failFulfillment: async (id) => {
      await db.checkoutAttempt.updateMany({ where: { id, fulfillmentState: 'processing' }, data: { fulfillmentState: 'uncertain' } })
    },
  }
}
