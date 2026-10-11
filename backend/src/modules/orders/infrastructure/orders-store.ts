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
    claimPaymentOrder: async (id, now) => (await db.checkoutAttempt.updateMany({
      where: { id, state: 'quoted', paymentState: 'not_started', wooOrderId: null, expiresAt: { gt: now } },
      data: { state: 'submitting' },
    })).count === 1,
    savePaymentOrder: async (id, order) => {
      const saved = await db.checkoutAttempt.updateMany({
        where: { id, state: 'submitting', wooOrderId: null },
        data: { wooOrderId: order.id, orderNumber: order.number, cartToken: null },
      })
      if (saved.count !== 1) throw new Error('WooCommerce payment order could not be saved to its checkout attempt')
    },
    claimPaymentStart: async (id, now, retryBefore, idempotencyBefore) => {
      const first = await db.checkoutAttempt.updateMany({
        where: { id, paymentId: null, paymentState: 'not_started', state: { in: ['quoted', 'submitting'] } },
        data: { paymentState: 'creating', paymentCreateStartedAt: now },
      })
      if (first.count === 1) return true
      return (await db.checkoutAttempt.updateMany({
        where: {
          id, paymentId: null, paymentState: 'creating', state: { in: ['quoted', 'submitting'] },
          paymentCreateStartedAt: { gt: idempotencyBefore }, updatedAt: { lte: retryBefore },
        },
        data: { updatedAt: now },
      })).count === 1
    },
    expirePaymentStartClaims: async (idempotencyBefore) => (await db.checkoutAttempt.updateMany({
      where: { paymentId: null, paymentState: 'creating', paymentCreateStartedAt: { lte: idempotencyBefore } },
      data: { paymentState: 'uncertain', state: 'uncertain' },
    })).count,
    finish: async (id, orderNumber) => {
      await db.$transaction(async (tx) => {
        await tx.checkoutAttempt.update({ where: { id }, data: { state: 'confirmed', orderNumber, cartToken: null } })
        if (emailEnabled) {
          await enqueueTask(tx, { type: 'orders:notify', dedupeKey: `${id}:email`, payload: { id, channel: 'email' } })
        }
      })
    },
    fail: async (id, state) => { await db.checkoutAttempt.update({ where: { id }, data: { state } }) },
    findByPaymentId: (paymentId) => db.checkoutAttempt.findUnique({ where: { paymentId } }),
    findById: (id) => db.checkoutAttempt.findUnique({ where: { id } }),
    attachPayment: async (id, paymentId) => {
      return (await db.checkoutAttempt.updateMany({
        where: { id, paymentId: null, paymentState: { in: ['not_started', 'creating', 'uncertain'] } },
        data: { paymentId, paymentState: 'pending' },
      })).count === 1
    },
    rejectPaymentStart: async (id) => {
      await db.$transaction(async (tx) => {
        const updated = await tx.checkoutAttempt.updateMany({
          where: { id, paymentId: null, paymentState: 'creating', wooOrderId: { not: null } },
          data: { paymentState: 'canceled', state: 'rejected' },
        })
        if (updated.count === 1) {
          await enqueueTask(tx, { type: 'payment:cancel-order', dedupeKey: id, payload: { id } })
        } else {
          await tx.checkoutAttempt.updateMany({
            where: { id, paymentId: null, paymentState: 'creating', wooOrderId: null },
            data: { paymentState: 'not_started', paymentCreateStartedAt: null },
          })
        }
      })
    },
    findPending: (retryBefore, idempotencyBefore, limit) => db.checkoutAttempt.findMany({
      where: { OR: [
        { paymentState: 'pending', paymentId: { not: null }, updatedAt: { lte: retryBefore } },
        { paymentState: 'creating', paymentId: null, paymentCreateStartedAt: { gt: idempotencyBefore }, updatedAt: { lte: retryBefore } },
      ] },
      orderBy: { updatedAt: 'asc' }, take: limit,
    }),
    expireUnpaidPaymentOrders: async (staleBefore, limit) => db.$transaction(async (tx) => {
      const attempts = await tx.checkoutAttempt.findMany({
        where: { wooOrderId: { not: null }, paymentId: null, paymentState: 'not_started', state: 'submitting', updatedAt: { lte: staleBefore } },
        orderBy: { updatedAt: 'asc' }, take: limit, select: { id: true },
      })
      let expired = 0
      for (const { id } of attempts) {
        const updated = await tx.checkoutAttempt.updateMany({
          where: { id, wooOrderId: { not: null }, paymentId: null, paymentState: 'not_started', state: 'submitting', updatedAt: { lte: staleBefore } },
          data: { paymentState: 'canceled', state: 'rejected' },
        })
        if (updated.count !== 1) continue
        await enqueueTask(tx, { type: 'payment:cancel-order', dedupeKey: id, payload: { id } })
        expired += 1
      }
      return expired
    }),
    recordPayment: async (id, paymentId, state: PaymentState) => {
      await db.$transaction(async (tx) => {
        const updated = await tx.checkoutAttempt.updateMany({
          where: { id, paymentId, paymentState: { in: ['not_started', 'creating', 'pending', 'uncertain'] } },
          data: {
            paymentState: state,
            ...(state === 'succeeded' ? { fulfillmentState: 'queued' as const } : {}),
            ...(state === 'canceled' ? { state: 'rejected' as const } : {}),
          },
        })
        if (updated.count === 1 && state === 'succeeded') {
          await enqueueTask(tx, { type: 'payment:fulfill', dedupeKey: id, payload: { id } })
        }
        if (updated.count === 1 && state === 'canceled') {
          await enqueueTask(tx, { type: 'payment:cancel-order', dedupeKey: id, payload: { id } })
        }
      })
    },
    claimFulfillment: async (id) => (await db.checkoutAttempt.updateMany({
      where: { id, paymentState: 'succeeded', OR: [
        { wooOrderId: { not: null }, fulfillmentState: { in: ['queued', 'processing', 'uncertain'] } },
        { wooOrderId: null, fulfillmentState: 'queued' },
      ] },
      data: { fulfillmentState: 'processing' },
    })).count === 1,
    finishFulfillment: async (id, orderNumber, skipped) => {
      await db.$transaction(async (tx) => {
        const updated = await tx.checkoutAttempt.updateMany({
          where: { id, fulfillmentState: 'processing', paymentState: 'succeeded' },
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
