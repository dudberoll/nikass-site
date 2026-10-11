import { z } from 'zod'
import { orderQuoteRequestSchema, orderTotalsSchema } from '@web-app-demo/contracts'

import type { BackendRuntime } from '../../../runtime'
import { TerminalTaskError } from '../../../outbox'
import { OrderFailure } from '../application/ports'
import { createOrderStore } from './orders-store'
import { createWooCommerceOrders } from './woocommerce-orders'

export async function fulfillPayment(payload: unknown, runtime: BackendRuntime, signal: AbortSignal) {
  void signal
  const input = z.object({ id: z.string().uuid() }).safeParse(payload)
  if (!input.success) throw new TerminalTaskError('Invalid payment fulfillment payload')
  const row = await runtime.prisma.checkoutAttempt.findUnique({ where: { id: input.data.id } })
  if (!row || row.paymentState !== 'succeeded') return 'skipped' as const
  if (row.fulfillmentState === 'confirmed' || row.fulfillmentState === 'skipped') return 'skipped' as const

  const store = createOrderStore(runtime.prisma, Boolean(runtime.env.ORDER_MANAGER_EMAIL && ['postbox', 'resend'].includes(runtime.env.EMAIL_DELIVERY)))
  if (!row.wooOrderId && row.fulfillmentState !== 'queued') {
    await store.failFulfillment(row.id)
    throw new TerminalTaskError('Legacy paid WooCommerce order requires manual reconciliation')
  }
  if (!await store.claimFulfillment(row.id)) return 'skipped' as const
  if (runtime.env.YOO_KASSA_FULFILLMENT_MODE === 'disabled' && !row.wooOrderId) {
    await store.finishFulfillment(row.id, null, true)
    return 'skipped' as const
  }

  if ((!row.wooOrderId && !row.cartToken) || !row.paymentId || !runtime.env.WOOCOMMERCE_PRODUCTS_ENDPOINT || !runtime.env.WOOCOMMERCE_STORE_ENDPOINT || !runtime.env.WOOCOMMERCE_CONSUMER_KEY || !runtime.env.WOOCOMMERCE_CONSUMER_SECRET) {
    await store.failFulfillment(row.id)
    throw new TerminalTaskError('Payment fulfillment is missing its order data')
  }

  try {
    const order = createWooCommerceOrders({
      productsEndpoint: runtime.env.WOOCOMMERCE_PRODUCTS_ENDPOINT,
      storeEndpoint: runtime.env.WOOCOMMERCE_STORE_ENDPOINT,
      consumerKey: runtime.env.WOOCOMMERCE_CONSUMER_KEY,
      consumerSecret: runtime.env.WOOCOMMERCE_CONSUMER_SECRET,
      timeoutMs: runtime.env.CATALOG_REQUEST_TIMEOUT_MS,
    })
    const orderNumber = row.wooOrderId
      ? await order.setPaymentOrderPaid(row.wooOrderId, orderQuoteRequestSchema.parse(row.input), orderTotalsSchema.parse(row.totals), row.paymentId)
      : await order.submitPaid(row.cartToken!, orderQuoteRequestSchema.parse(row.input), orderTotalsSchema.parse(row.totals), row.paymentId)
    await store.finishFulfillment(row.id, orderNumber, false)
    return 'done' as const
  } catch (error) {
    await store.failFulfillment(row.id)
    if (error instanceof OrderFailure && (error.kind === 'invalid' || error.kind === 'conflict' || error.kind === 'not_found')) {
      throw new TerminalTaskError('Payment fulfillment requires reconciliation', { cause: error })
    }
    throw error
  }
}

export async function cancelPaymentOrder(payload: unknown, runtime: BackendRuntime, signal: AbortSignal) {
  void signal
  const input = z.object({ id: z.string().uuid() }).safeParse(payload)
  if (!input.success) throw new TerminalTaskError('Invalid payment order cancellation payload')
  const row = await runtime.prisma.checkoutAttempt.findUnique({ where: { id: input.data.id } })
  if (!row || row.paymentState !== 'canceled' || !row.wooOrderId) return 'skipped' as const
  if (!runtime.env.WOOCOMMERCE_PRODUCTS_ENDPOINT || !runtime.env.WOOCOMMERCE_STORE_ENDPOINT || !runtime.env.WOOCOMMERCE_CONSUMER_KEY || !runtime.env.WOOCOMMERCE_CONSUMER_SECRET) {
    throw new TerminalTaskError('Payment order cancellation is missing WooCommerce configuration')
  }

  const order = createWooCommerceOrders({
    productsEndpoint: runtime.env.WOOCOMMERCE_PRODUCTS_ENDPOINT,
    storeEndpoint: runtime.env.WOOCOMMERCE_STORE_ENDPOINT,
    consumerKey: runtime.env.WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret: runtime.env.WOOCOMMERCE_CONSUMER_SECRET,
    timeoutMs: runtime.env.CATALOG_REQUEST_TIMEOUT_MS,
  })
  await order.cancelPaymentOrder(row.wooOrderId)
  return 'done' as const
}
