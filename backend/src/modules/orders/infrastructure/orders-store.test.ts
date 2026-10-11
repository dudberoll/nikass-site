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

test('claims a WooCommerce payment order once and saves its ID before releasing the cart token', async () => {
  const updates: Array<{ where: unknown; data: unknown }> = []
  let count = 1
  const db = {
    checkoutAttempt: { updateMany: async (args: { where: unknown; data: unknown }) => { updates.push(args); return { count } } },
  } as unknown as DbClient
  const store = createOrderStore(db, false)
  const now = new Date('2026-10-11T12:00:00Z')

  expect(await store.claimPaymentOrder('attempt-id', now)).toBe(true)
  count = 0
  expect(await store.claimPaymentOrder('attempt-id', now)).toBe(false)
  count = 1
  await store.savePaymentOrder('attempt-id', { id: 42, number: 'N-42' })

  expect(updates).toEqual([
    { where: { id: 'attempt-id', state: 'quoted', paymentState: 'not_started', wooOrderId: null, expiresAt: { gt: now } }, data: { state: 'submitting' } },
    { where: { id: 'attempt-id', state: 'quoted', paymentState: 'not_started', wooOrderId: null, expiresAt: { gt: now } }, data: { state: 'submitting' } },
    { where: { id: 'attempt-id', state: 'submitting', wooOrderId: null }, data: { wooOrderId: 42, orderNumber: 'N-42', cartToken: null } },
  ])
})

test('claims payment creation once and only reclaims an ambiguous request inside YooKassa’s 24-hour window', async () => {
  const updates: Array<{ where: Record<string, unknown>; data: unknown }> = []
  let initialCount = 1
  let retryCount = 0
  const db = {
    checkoutAttempt: { updateMany: async (args: { where: Record<string, unknown>; data: unknown }) => {
      updates.push(args)
      return { count: args.where.paymentState === 'not_started' ? initialCount : retryCount }
    } },
  } as unknown as DbClient
  const store = createOrderStore(db, false)
  const now = new Date('2026-10-11T12:00:00Z')
  const retryBefore = new Date('2026-10-11T11:50:00Z')
  const idempotencyBefore = new Date('2026-10-10T13:00:00Z')

  expect(await store.claimPaymentStart('attempt-id', now, retryBefore, idempotencyBefore)).toBe(true)
  initialCount = 0
  expect(await store.claimPaymentStart('attempt-id', now, retryBefore, idempotencyBefore)).toBe(false)
  retryCount = 1
  expect(await store.claimPaymentStart('attempt-id', now, retryBefore, idempotencyBefore)).toBe(true)

  expect(updates).toEqual([
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'not_started', state: { in: ['quoted', 'submitting'] } }, data: { paymentState: 'creating', paymentCreateStartedAt: now } },
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'not_started', state: { in: ['quoted', 'submitting'] } }, data: { paymentState: 'creating', paymentCreateStartedAt: now } },
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'creating', state: { in: ['quoted', 'submitting'] }, paymentCreateStartedAt: { gt: idempotencyBefore }, updatedAt: { lte: retryBefore } }, data: { updatedAt: now } },
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'not_started', state: { in: ['quoted', 'submitting'] } }, data: { paymentState: 'creating', paymentCreateStartedAt: now } },
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'creating', state: { in: ['quoted', 'submitting'] }, paymentCreateStartedAt: { gt: idempotencyBefore }, updatedAt: { lte: retryBefore } }, data: { updatedAt: now } },
  ])
})

test('expires ambiguous payment-create claims without issuing another provider request', async () => {
  let query: unknown
  const db = { checkoutAttempt: { updateMany: async (args: unknown) => { query = args; return { count: 2 } } } } as unknown as DbClient

  expect(await createOrderStore(db, false).expirePaymentStartClaims(new Date('2026-10-10T12:00:00Z'))).toBe(2)
  expect(query).toEqual({
    where: { paymentId: null, paymentState: 'creating', paymentCreateStartedAt: { lte: new Date('2026-10-10T12:00:00Z') } },
    data: { paymentState: 'uncertain', state: 'uncertain' },
  })
})

test('cancels stale Woo payment reservations atomically and queues their cancellation', async () => {
  const queries: unknown[] = []
  const tasks: unknown[] = []
  const tx = {
    checkoutAttempt: {
      findMany: async (args: unknown) => { queries.push(args); return [{ id: 'attempt-id' }] },
      updateMany: async (args: unknown) => { queries.push(args); return { count: 1 } },
    },
    taskOutbox: {
      createMany: async ({ data }: { data: unknown[] }) => { tasks.push(...data); return { count: 1 } },
      findUniqueOrThrow: async () => ({ id: 'task-id' }),
    },
  }
  const db = { $transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx) } as unknown as DbClient
  const staleBefore = new Date('2026-10-11T11:50:00Z')

  expect(await createOrderStore(db, false).expireUnpaidPaymentOrders(staleBefore, 25)).toBe(1)
  expect(queries).toEqual([
    { where: { wooOrderId: { not: null }, paymentId: null, paymentState: 'not_started', state: 'submitting', updatedAt: { lte: staleBefore } }, orderBy: { updatedAt: 'asc' }, take: 25, select: { id: true } },
    { where: { id: 'attempt-id', wooOrderId: { not: null }, paymentId: null, paymentState: 'not_started', state: 'submitting', updatedAt: { lte: staleBefore } }, data: { paymentState: 'canceled', state: 'rejected' } },
  ])
  expect(tasks).toEqual([{ type: 'payment:cancel-order', dedupeKey: 'attempt-id', payload: { id: 'attempt-id' } }])
})

test('queues a Woo cancellation only after YooKassa reports a terminal canceled payment', async () => {
  const tasks: Array<{ type: string; dedupeKey: string; payload: unknown }> = []
  const db = {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
      checkoutAttempt: { updateMany: async (args: { where: unknown; data: unknown }) => {
        expect(args.where).toEqual({ id: 'attempt-id', paymentId: 'payment-id', paymentState: { in: ['not_started', 'creating', 'pending', 'uncertain'] } })
        expect(args.data).toMatchObject({ paymentState: 'canceled', state: 'rejected' })
        return { count: 1 }
      } },
      taskOutbox: {
        createMany: async ({ data }: { data: typeof tasks }) => { tasks.push(...data); return { count: data.length } },
        findUniqueOrThrow: async () => ({ id: 'task-id' }),
      },
    }),
  } as unknown as DbClient

  await createOrderStore(db, false).recordPayment('attempt-id', 'payment-id', 'canceled')

  expect(tasks).toEqual([{ type: 'payment:cancel-order', dedupeKey: 'attempt-id', payload: { id: 'attempt-id' } }])
})

test('attaches provider IDs as pending and queues cancellation for a definitive payment-start rejection', async () => {
  const updates: Array<{ where: unknown; data: unknown }> = []
  const tasks: Array<{ type: string; dedupeKey: string; payload: unknown }> = []
  const db = {
    checkoutAttempt: { updateMany: async (args: { where: unknown; data: unknown }) => { updates.push(args); return { count: 1 } } },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
      checkoutAttempt: { updateMany: async (args: { where: unknown; data: unknown }) => { updates.push(args); return { count: 1 } } },
      taskOutbox: {
        createMany: async ({ data }: { data: typeof tasks }) => { tasks.push(...data); return { count: data.length } },
        findUniqueOrThrow: async () => ({ id: 'task-id' }),
      },
    }),
  } as unknown as DbClient
  const store = createOrderStore(db, false)

  await store.attachPayment('attempt-id', 'payment-id')
  await store.rejectPaymentStart('attempt-id')

  expect(updates).toEqual([
    { where: { id: 'attempt-id', paymentId: null, paymentState: { in: ['not_started', 'creating', 'uncertain'] } }, data: { paymentId: 'payment-id', paymentState: 'pending' } },
    { where: { id: 'attempt-id', paymentId: null, paymentState: 'creating', wooOrderId: { not: null } }, data: { paymentState: 'canceled', state: 'rejected' } },
  ])
  expect(tasks).toEqual([{ type: 'payment:cancel-order', dedupeKey: 'attempt-id', payload: { id: 'attempt-id' } }])
})

test('reconciles old pending payments and ambiguous creates even without a Woo order ID', async () => {
  let query: unknown
  const db = { checkoutAttempt: { findMany: async (args: unknown) => { query = args; return [] } } } as unknown as DbClient

  await createOrderStore(db, false).findPending(new Date('2026-10-11T12:00:00Z'), new Date('2026-10-10T12:00:00Z'), 25)

  expect(query).toEqual({ where: { OR: [
    { paymentState: 'pending', paymentId: { not: null }, updatedAt: { lte: new Date('2026-10-11T12:00:00Z') } },
    { paymentState: 'creating', paymentId: null, paymentCreateStartedAt: { gt: new Date('2026-10-10T12:00:00Z') }, updatedAt: { lte: new Date('2026-10-11T12:00:00Z') } },
  ] }, orderBy: { updatedAt: 'asc' }, take: 25 })
})

test('can reclaim fulfillment when an outbox lease is recovered', async () => {
  let args: unknown
  const db = { checkoutAttempt: { updateMany: async (value: unknown) => { args = value; return { count: 1 } } } } as unknown as DbClient

  expect(await createOrderStore(db, false).claimFulfillment('attempt-id')).toBe(true)
  expect(args).toEqual({
    where: { id: 'attempt-id', paymentState: 'succeeded', OR: [
      { wooOrderId: { not: null }, fulfillmentState: { in: ['queued', 'processing', 'uncertain'] } },
      { wooOrderId: null, fulfillmentState: 'queued' },
    ] },
    data: { fulfillmentState: 'processing' },
  })
})
