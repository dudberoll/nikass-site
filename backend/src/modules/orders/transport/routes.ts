import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { apiErrorSchema, orderQuoteRequestSchema, orderQuoteResponseSchema, orderTokenRequestSchema, orderResultSchema } from '@web-app-demo/contracts'
import { AppError, validationErrorHook } from '../../../http/errors'
import { OrderFailure } from '../application/ports'
import type { OrdersService } from '../application/orders-service'

export function createOrderRoutes(service: OrdersService) {
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
  return routes
}
