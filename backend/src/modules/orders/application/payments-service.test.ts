import { expect, test } from 'bun:test'
import { PaymentsService } from './payments-service'
import { OrderFailure, PaymentFailure, type CheckoutAttempt, type PaymentOrderProvider, type PaymentProvider, type PaymentStore, type ProviderPayment } from './ports'

const paymentId = '223e4567-e89b-12d3-a456-426614174000'
const attemptId = '123e4567-e89b-12d3-a456-426614174000'
const input = {
  cart: { version: 1 as const, items: [{ slug: 'station', sku: 'S1', quantity: 1 }] },
  customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Тест', consent: true as const },
  promoCode: 'sale10',
}
const makeRow = (overrides: Partial<CheckoutAttempt> = {}): CheckoutAttempt => ({
  id: attemptId, cartToken: 'cart-token', wooOrderId: null, input,
  totals: { currency: 'RUB', items: [{ sku: 'S1', name: 'Station', quantity: 1, totalMinor: 2500 }], discountMinor: 0, shippingMinor: 0, totalMinor: 2500 },
  expiresAt: new Date(Date.now() + 60_000), state: 'quoted', orderNumber: null,
  paymentId: null, paymentState: 'not_started', fulfillmentState: 'not_started', ...overrides,
})
const makeStore = (attempt = makeRow(), claimOrder: (id: string, now: Date) => Promise<boolean> = async () => true) => {
  const calls: string[] = []
  let paymentClaimUpdatedAt = attempt.paymentCreateStartedAt ?? null
  const store: PaymentStore & { find(tokenHash: string): Promise<CheckoutAttempt | null> } = {
    find: async () => attempt,
    findByPaymentId: async (id) => id === attempt.paymentId ? attempt : null,
    findById: async (id) => id === attempt.id ? attempt : null,
    findPending: async () => [],
    expireUnpaidPaymentOrders: async () => 0,
    claimPaymentStart: async (_id, now, retryBefore, idempotencyBefore) => {
      if (attempt.paymentState === 'not_started') {
        Object.assign(attempt, { paymentState: 'creating' as const, paymentCreateStartedAt: now })
        paymentClaimUpdatedAt = now
        return true
      }
      if (attempt.paymentState === 'creating' && attempt.paymentCreateStartedAt! > idempotencyBefore && paymentClaimUpdatedAt! <= retryBefore) {
        paymentClaimUpdatedAt = now
        return true
      }
      return false
    },
    expirePaymentStartClaims: async () => 0,
    claimPaymentOrder: async (...args) => { calls.push('claim'); return claimOrder(...args) },
    savePaymentOrder: async (_id, order) => { calls.push('save-woo'); Object.assign(attempt, { state: 'submitting', wooOrderId: order.id, orderNumber: order.number, cartToken: null }) },
    fail: async (_id, state) => { Object.assign(attempt, { state }) },
    attachPayment: async (_id, id) => {
      calls.push('save-payment')
      if (attempt.paymentId) return attempt.paymentId === id
      Object.assign(attempt, { paymentId: id, paymentState: 'pending' as const })
      return true
    },
    rejectPaymentStart: async () => {
      calls.push('reject-payment')
      Object.assign(attempt, { state: attempt.wooOrderId ? 'rejected' as const : attempt.state,
        paymentState: attempt.wooOrderId ? 'canceled' as const : 'not_started' as const })
    },
    recordPayment: async (_id, id, state) => {
      if (attempt.paymentState === 'not_started' || attempt.paymentState === 'pending') {
        Object.assign(attempt, { paymentId: id, paymentState: state,
          ...(state === 'succeeded' ? { fulfillmentState: 'queued' as const } : {}),
          ...(state === 'canceled' ? { state: 'rejected' as const } : {}) })
      }
    },
    claimFulfillment: async () => false,
    finishFulfillment: async () => undefined,
    failFulfillment: async () => undefined,
  }
  return { calls, store, attempt, agePaymentClaim: () => { paymentClaimUpdatedAt = new Date(Date.now() - 11 * 60_000) } }
}
const pending: ProviderPayment = { id: paymentId, status: 'pending', paid: false, test: true,
  amount: { value: '25.00', currency: 'RUB' }, confirmationUrl: 'https://yoomoney.ru/checkout/test', metadata: { attemptId } }
const reservedOrder: PaymentOrderProvider = {
  createPaymentOrder: async () => ({ id: 42, number: 'N-42' }),
  getPaymentOrder: async () => ({ id: 42, number: 'N-42', status: 'on-hold', totalMinor: 2500, transactionId: '', couponCodes: ['sale10'] }),
  setPaymentOrderPaid: async () => 'N-42',
  cancelPaymentOrder: async () => undefined,
}

test('reserves and persists one WooCommerce order before creating a hosted payment', async () => {
  const { calls: storeCalls, store, attempt } = makeStore()
  const events: string[] = []
  const provider: PaymentProvider = {
    create: async () => { events.push('payment'); return pending },
    get: async () => ({ ...pending, status: 'succeeded', paid: true }),
  }
  const orders: Pick<PaymentOrderProvider, 'createPaymentOrder' | 'getPaymentOrder'> & { assertInStock: () => Promise<void> } = {
    assertInStock: async () => { events.push('stock') },
    createPaymentOrder: async () => { events.push('woo'); return { id: 42, number: 'N-42' } },
    getPaymentOrder: async (id) => { events.push('verify'); expect(attempt.wooOrderId).toBe(42); return reservedOrder.getPaymentOrder(id) },
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, orders, true)

  expect(await service.start('checkout-token')).toEqual({ paymentId, confirmationUrl: pending.confirmationUrl!, attemptId })
  expect(events).toEqual(['stock', 'woo', 'verify', 'payment'])
  expect(storeCalls).toEqual(['claim', 'save-woo', 'save-payment'])
  expect(attempt).toMatchObject({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting', paymentId, paymentState: 'pending' })

  expect(await service.status(paymentId)).toEqual({ paymentId, paymentState: 'succeeded', fulfillmentState: 'queued', orderNumber: 'N-42' })
})

test('persists the returned Woo order ID before verifying the new order', async () => {
  const { store, attempt, calls } = makeStore()
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates += 1; return pending }, get: async () => pending }
  const orders = { ...reservedOrder, assertInStock: async () => undefined,
    getPaymentOrder: async () => { throw new OrderFailure('unavailable', 'Woo order verification timed out') } }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, orders, true)

  await expect(service.start('checkout-token')).rejects.toThrow('Woo order verification timed out')

  expect(attempt).toMatchObject({ state: 'submitting', wooOrderId: 42, orderNumber: 'N-42', paymentId: null })
  expect(calls).toEqual(['claim', 'save-woo'])
  expect(paymentCreates).toBe(0)
})

test('reuses a persisted Woo order when payment creation must be retried', async () => {
  const attempt = makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting' })
  const { calls: storeCalls, store, agePaymentClaim } = makeStore(attempt)
  let wooCreates = 0
  let paymentCreates = 0
  const provider: PaymentProvider = {
    create: async () => {
      paymentCreates += 1
      if (paymentCreates === 1) throw new Error('temporary provider outage')
      return pending
    },
    get: async () => pending,
  }
  const orders = { ...reservedOrder, assertInStock: async () => undefined,
    createPaymentOrder: async () => { wooCreates += 1; return { id: 43, number: 'N-43' } } }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, orders, true)

  await expect(service.start('checkout-token')).rejects.toThrow('temporary provider outage')
  agePaymentClaim()
  expect(await service.start('checkout-token')).toEqual({ paymentId, confirmationUrl: pending.confirmationUrl!, attemptId })
  expect(wooCreates).toBe(0)
  expect(storeCalls).toEqual(['save-payment'])
})

test('releases a reserved Woo order after YooKassa definitively rejects payment creation', async () => {
  const { store, attempt, calls } = makeStore()
  const provider: PaymentProvider = {
    create: async () => { throw new PaymentFailure('unavailable', 'receipt is not configured', 'not_created') },
    get: async () => pending,
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => undefined }, true)

  await expect(service.start('checkout-token')).rejects.toThrow('receipt is not configured')

  expect(calls).toEqual(['claim', 'save-woo', 'reject-payment'])
  expect(attempt).toMatchObject({ state: 'rejected', wooOrderId: 42, paymentId: null, paymentState: 'canceled' })
})

test('does not recreate payment after a definite rejection while WC cancellation is pending', async () => {
  const { store } = makeStore(makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'rejected', paymentState: 'canceled' }))
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates += 1; return pending }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => undefined }, true)

  await expect(service.start('checkout-token')).rejects.toThrow('уже отклонён')
  expect(paymentCreates).toBe(0)
})

test('attaches an early terminal webhook as pending before recording its final effect', async () => {
  const { store, attempt, calls } = makeStore(makeRow({ wooOrderId: 42, state: 'submitting' }))
  const succeeded = { ...pending, status: 'succeeded' as const, paid: true }
  const provider: PaymentProvider = { create: async () => pending, get: async () => succeeded }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined }, true)

  await service.webhook({ type: 'notification', event: 'payment.succeeded', object: { id: paymentId } })

  expect(calls).toContain('save-payment')
  expect(attempt).toMatchObject({ paymentId, paymentState: 'succeeded', fulfillmentState: 'queued' })
})

test('does not create two Woo orders when another request already claimed checkout', async () => {
  const { store } = makeStore(makeRow(), async () => false)
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates += 1; return pending }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => undefined }, true)

  await expect(service.start('checkout-token')).rejects.toBeInstanceOf(PaymentFailure)
  expect(paymentCreates).toBe(0)
})

test('only one concurrent request can create a payment for a reserved Woo order', async () => {
  const { store, attempt } = makeStore()
  let release!: (value: ProviderPayment) => void
  let started!: () => void
  const providerStarted = new Promise<void>((resolve) => { started = resolve })
  const providerResult = new Promise<ProviderPayment>((resolve) => { release = resolve })
  let creates = 0
  const provider: PaymentProvider = {
    create: async () => { creates += 1; started(); return providerResult },
    get: async () => pending,
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => undefined }, true)

  const first = service.start('checkout-token')
  await providerStarted
  await expect(service.start('checkout-token')).rejects.toBeInstanceOf(PaymentFailure)
  release(pending)

  expect(await first).toMatchObject({ paymentId, attemptId })
  expect(creates).toBe(1)
  expect(attempt).toMatchObject({ paymentId, paymentState: 'pending' })
})

test('a concurrent request cannot cancel a payment after the other request has claimed creation', async () => {
  const { store, attempt } = makeStore()
  let rejectProvider!: (error: Error) => void
  let started!: () => void
  const providerStarted = new Promise<void>((resolve) => { started = resolve })
  const providerResult = new Promise<ProviderPayment>((_resolve, reject) => { rejectProvider = reject })
  let creates = 0
  const provider: PaymentProvider = {
    create: async () => { creates += 1; started(); return providerResult },
    get: async () => pending,
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => undefined }, true)

  const first = service.start('checkout-token')
  await providerStarted
  await expect(service.start('checkout-token')).rejects.toBeInstanceOf(PaymentFailure)
  rejectProvider(new PaymentFailure('unavailable', 'provider rejected', 'not_created'))
  await expect(first).rejects.toThrow('provider rejected')

  expect(creates).toBe(1)
  expect(attempt).toMatchObject({ state: 'rejected', paymentState: 'canceled', paymentId: null })
})

test('refuses to issue a payment link after the reserved Woo order was canceled', async () => {
  const { store } = makeStore(makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting' }))
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates += 1; return pending }, get: async () => pending }
  const canceledOrder = { ...reservedOrder, getPaymentOrder: async () => ({ ...(await reservedOrder.getPaymentOrder(42)), status: 'cancelled' as const }) }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...canceledOrder, assertInStock: async () => { throw new Error('reserved orders do not recheck stock') } }, true)

  await expect(service.start('checkout-token')).rejects.toThrow('больше не ожидает оплату')
  expect(paymentCreates).toBe(0)
})

test('rejects a provider amount that differs from the quoted total', async () => {
  const attempt = makeRow({ paymentId })
  const { store } = makeStore(attempt)
  const provider: PaymentProvider = {
    create: async () => { throw new Error('not used') },
    get: async () => ({ ...pending, status: 'succeeded', paid: true, amount: { value: '24.99', currency: 'RUB' } }),
  }

  await expect(new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined }).status(paymentId)).rejects.toThrow('Параметры платежа')
})

test('does not start a payment when the quoted product has gone out of stock', async () => {
  const { store } = makeStore()
  let paymentCreates = 0
  const provider: PaymentProvider = { create: async () => { paymentCreates += 1; return pending }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { assertInStock: async () => { throw new OrderFailure('invalid', 'Товара сейчас нет в наличии.') } })

  await expect(service.start('checkout-token')).rejects.toThrow('Товара сейчас нет в наличии.')
  expect(paymentCreates).toBe(0)
})

test('does not recheck stock when resuming a payment whose Woo order already reserves it', async () => {
  const attempt = makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting', paymentId })
  const { store } = makeStore(attempt)
  const provider: PaymentProvider = { create: async () => { throw new Error('not used') }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true,
    { ...reservedOrder, assertInStock: async () => { throw new Error('stock is already reserved in Woo') } }, true)

  expect(await service.start('checkout-token')).toEqual({ paymentId, confirmationUrl: pending.confirmationUrl!, attemptId })
})

test('reconciles pending reserved orders and records YooKassa cancellation', async () => {
  const attempt = makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting', paymentId, paymentState: 'pending' })
  const { store } = makeStore(attempt)
  let lookup: { retryBefore: Date; idempotencyBefore: Date; limit: number } | undefined
  store.expirePaymentStartClaims = async () => 0
  store.findPending = async (retryBefore, idempotencyBefore, limit) => { lookup = { retryBefore, idempotencyBefore, limit }; return [attempt] }
  const provider: PaymentProvider = {
    create: async () => { throw new Error('not used') },
    get: async () => ({ ...pending, status: 'canceled', paid: false, confirmationUrl: null }),
  }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined })
  const now = new Date('2026-10-11T12:00:00Z')

  await service.reconcilePending(now)

  expect(lookup).toEqual({ retryBefore: new Date('2026-10-11T11:50:00Z'), idempotencyBefore: new Date('2026-10-10T13:00:00Z'), limit: 25 })
  expect(attempt.paymentState).toBe('canceled')
})

test('marks payment creation older than the YooKassa idempotency window for manual reconciliation', async () => {
  const attempt = makeRow({ paymentState: 'creating', paymentCreateStartedAt: new Date('2026-10-10T11:59:00Z'), state: 'submitting' })
  const { store } = makeStore(attempt)
  let expiredBefore: Date | undefined
  let unpaidOrdersBefore: Date | undefined
  store.expireUnpaidPaymentOrders = async (before) => { unpaidOrdersBefore = before; return 0 }
  store.expirePaymentStartClaims = async (before) => { expiredBefore = before; Object.assign(attempt, { paymentState: 'uncertain' as const, state: 'uncertain' as const }); return 1 }
  store.findPending = async () => []
  const provider: PaymentProvider = { create: async () => { throw new Error('must not post after 24h') }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { assertInStock: async () => undefined }, true)

  await service.reconcilePending(new Date('2026-10-11T12:00:00Z'))

  expect(unpaidOrdersBefore).toEqual(new Date('2026-10-11T11:50:00Z'))
  expect(expiredBefore).toEqual(new Date('2026-10-10T13:00:00Z'))
  expect(attempt).toMatchObject({ paymentState: 'uncertain', state: 'uncertain' })
})

test('reconciliation expires abandoned Woo reservations after its inactivity grace period', async () => {
  const attempt = makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting', paymentState: 'not_started' })
  const { store } = makeStore(attempt)
  let expiration: { staleBefore: Date; limit: number } | undefined
  store.expireUnpaidPaymentOrders = async (staleBefore, limit) => { expiration = { staleBefore, limit }; return 1 }
  store.findPending = async () => []
  const provider: PaymentProvider = { create: async () => { throw new Error('not used') }, get: async () => pending }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, { ...reservedOrder, assertInStock: async () => undefined }, true)
  const now = new Date('2026-10-11T12:00:00Z')

  await service.reconcilePending(now)

  expect(expiration).toEqual({ staleBefore: new Date('2026-10-11T11:50:00Z'), limit: 25 })
  expect(attempt).toMatchObject({ paymentState: 'not_started', state: 'submitting' })
})

test('retries an ambiguous YooKassa creation only after the lease expires', async () => {
  const attempt = makeRow({ wooOrderId: 42, orderNumber: 'N-42', cartToken: null, state: 'submitting', paymentState: 'creating', paymentCreateStartedAt: new Date('2026-10-11T11:30:00Z') })
  const { store } = makeStore(attempt)
  store.findPending = async () => [attempt]
  store.expirePaymentStartClaims = async () => 0
  let creates = 0
  let idempotencyKey = ''
  const provider: PaymentProvider = {
    create: async (input) => { creates += 1; idempotencyKey = input.idempotenceKey; return pending },
    get: async () => pending,
  }
  const orders = { ...reservedOrder, assertInStock: async () => undefined }
  const service = new PaymentsService(store, provider, 'http://localhost:4322/checkout', true, orders, true)

  await service.reconcilePending(new Date('2026-10-11T12:00:00Z'))

  expect(creates).toBe(1)
  expect(idempotencyKey).toBeTruthy()
  expect(attempt).toMatchObject({ paymentId, paymentState: 'pending' })
})
