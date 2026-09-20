import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { apiErrorSchema, orderQuoteRequestSchema, orderQuoteResponseSchema, orderTokenRequestSchema, orderResultSchema, paymentStartResponseSchema, paymentStatusRequestSchema, paymentStatusResponseSchema } from '@web-app-demo/contracts'
import { AppError, validationErrorHook } from '../../../http/errors'
import { OrderFailure, PaymentFailure } from '../application/ports'
import type { OrdersService } from '../application/orders-service'
import type { PaymentsService } from '../application/payments-service'

export function createOrderRoutes(service: OrdersService, payments?: PaymentsService) {
  const routes = new OpenAPIHono({ defaultHook: validationErrorHook })
  const errors = Object.fromEntries([400, 404, 409, 503].map((status) => [status, { description: 'Order error', content: { 'application/json': { schema: apiErrorSchema } } }]))
  const execute = async <T,>(operation: () => Promise<T>) => {
    try { return await operation() } catch (error) {
      if (!(error instanceof OrderFailure)) {
        // Do not expose/log Prisma arguments, cart capabilities or customer data.
        throw new AppError(503, 'INTERNAL_ERROR', 'Сервис заказов временно недоступен.')
      }
      const status = { invalid: 400, not_found: 404, conflict: 409, unavailable: 503 } as const
      throw new AppError(status[error.kind], 'BAD_REQUEST', error.message)
    }
  }
  routes.use('*', async (c, next) => { c.header('Cache-Control', 'no-store'); await next() })
  routes.openapi(createRoute({ method: 'post', path: '/quote', request: { body: { required: true, content: { 'application/json': { schema: orderQuoteRequestSchema } } } }, responses: { 200: { description: 'Fresh quote, no order yet', content: { 'application/json': { schema: orderQuoteResponseSchema } } }, ...errors } }), async (c) => c.json(await execute(() => service.quote(c.req.valid('json'))), 200))
  routes.openapi(createRoute({ method: 'post', path: '/', request: { body: { required: true, content: { 'application/json': { schema: orderTokenRequestSchema } } } }, responses: { 200: { description: 'Order submission state', content: { 'application/json': { schema: orderResultSchema } } }, ...errors } }), async (c) => c.json(await execute(() => service.submit(c.req.valid('json').checkoutToken)), 200))
  routes.openapi(createRoute({ method: 'post', path: '/status', request: { body: { required: true, content: { 'application/json': { schema: orderTokenRequestSchema } } } }, responses: { 200: { description: 'Private order status; token is never in a URL', content: { 'application/json': { schema: orderResultSchema } } }, ...errors } }), async (c) => c.json(await execute(() => service.status(c.req.valid('json').checkoutToken)), 200))
  if (payments) {
    const executePayment = async <T,>(operation: () => Promise<T>) => {
      try { return await operation() } catch (error) {
        if (!(error instanceof PaymentFailure)) throw new AppError(503, 'INTERNAL_ERROR', 'Сервис оплаты временно недоступен.')
        const status = { invalid: 400, unavailable: 503, not_found: 404, conflict: 409 } as const
        throw new AppError(status[error.kind], 'BAD_REQUEST', error.message)
      }
    }
    routes.openapi(createRoute({ method: 'post', path: '/payment', request: { body: { required: true, content: { 'application/json': { schema: orderTokenRequestSchema } } } }, responses: { 200: { description: 'Hosted payment redirect', content: { 'application/json': { schema: paymentStartResponseSchema } } }, ...errors } }), async (c) => c.json(await executePayment(() => payments.start(c.req.valid('json').checkoutToken)), 200))
    routes.openapi(createRoute({ method: 'post', path: '/payment/status', request: { body: { required: true, content: { 'application/json': { schema: paymentStatusRequestSchema } } } }, responses: { 200: { description: 'Current payment and fulfillment state', content: { 'application/json': { schema: paymentStatusResponseSchema } } }, ...errors } }), async (c) => c.json(await executePayment(() => payments.status(c.req.valid('json').paymentId)), 200))
    routes.post('/payment/webhook', async (c) => {
      let body: unknown
      try { body = await c.req.json() } catch { throw new AppError(400, 'BAD_REQUEST', 'Некорректное уведомление ЮKassa.') }
      return c.json(await executePayment(() => payments.webhook(body)), 200)
    })
  }
  return routes
}
