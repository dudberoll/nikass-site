import { z } from 'zod'
import { orderQuoteRequestSchema, orderTotalsSchema } from '@web-app-demo/contracts'

import type { BackendRuntime } from '../../../runtime'
import { TerminalTaskError } from '../../../outbox'
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
  if (!await store.claimFulfillment(row.id)) return 'skipped' as const
  if (runtime.env.YOO_KASSA_FULFILLMENT_MODE === 'disabled') {
    await store.finishFulfillment(row.id, null, true)
    return 'skipped' as const
  }

  if (!row.cartToken || !row.paymentId || !runtime.env.WOOCOMMERCE_PRODUCTS_ENDPOINT || !runtime.env.WOOCOMMERCE_STORE_ENDPOINT || !runtime.env.WOOCOMMERCE_CONSUMER_KEY || !runtime.env.WOOCOMMERCE_CONSUMER_SECRET) {
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
    const orderNumber = await order.submitPaid(row.cartToken, orderQuoteRequestSchema.parse(row.input), orderTotalsSchema.parse(row.totals), row.paymentId)
    await store.finishFulfillment(row.id, orderNumber, false)
    return 'done' as const
  } catch {
    await store.failFulfillment(row.id)
    throw new TerminalTaskError('Payment fulfillment requires reconciliation')
  }
}
