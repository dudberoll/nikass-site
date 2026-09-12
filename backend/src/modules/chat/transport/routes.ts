import { apiErrorSchema, chatRequestSchema, chatResponseSchema } from '@web-app-demo/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'

import { AppError, validationErrorHook } from '../../../http/errors'
import { ChatService } from '../application/chat-service'
import type { ChatProvider } from '../application/ports'

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

export function createChatRoutes(provider: ChatProvider) {
  const service = new ChatService(provider)
  const routes = new OpenAPIHono({ defaultHook: validationErrorHook })

  routes.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    await next()
  })

  routes.openapi(createRoute({
    method: 'post',
    path: '/',
    request: {
      body: { required: true, content: { 'application/json': { schema: chatRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: chatResponseSchema } }, description: 'AI assistant reply' },
      400: { content: errorContent, description: 'Invalid chat payload' },
      503: { content: errorContent, description: 'AI provider is unavailable' },
    },
  }), async (c) => {
    try {
      return c.json(await service.respond(c.req.valid('json')), 200)
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Сервис консультанта временно недоступен.')
    }
  })

  return routes
}
