import { apiErrorSchema, cartReviewRequestSchema, cartReviewResponseSchema } from '@web-app-demo/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'

import { validationErrorHook } from '../../../http/errors'
import type { CatalogService } from '../application/catalog-service'
import {
  catalogListQuerySchema,
  catalogListResponseSchema,
  catalogProductParamsSchema,
  catalogProductResponseSchema,
} from './contracts'
import { executeCatalog } from './errors'

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const listCatalogRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: catalogListQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: catalogListResponseSchema } },
      description: 'Public product catalog',
    },
    400: { content: errorContent, description: 'Invalid catalog query' },
    503: { content: errorContent, description: 'Catalog provider is unavailable' },
  },
})

const getCatalogProductRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  request: {
    params: catalogProductParamsSchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: catalogProductResponseSchema } },
      description: 'Public product details',
    },
    400: { content: errorContent, description: 'Invalid product slug' },
    404: { content: errorContent, description: 'Product not found' },
    503: { content: errorContent, description: 'Catalog provider is unavailable' },
  },
})

export function createCatalogRoutes(service: CatalogService) {
  const routes = new OpenAPIHono({ defaultHook: validationErrorHook })

  routes.openapi(createRoute({
    method: 'post',
    path: '/cart/review',
    request: { body: { required: true, content: { 'application/json': { schema: cartReviewRequestSchema } } } },
    responses: {
      200: { content: { 'application/json': { schema: cartReviewResponseSchema } }, description: 'Fresh cart prices; no stock reservation or order' },
      400: { content: errorContent, description: 'Invalid cart' },
      503: { content: errorContent, description: 'Fresh catalog unavailable' },
    },
  }), async (c) => {
    const result = await executeCatalog(() => service.reviewCart(c.req.valid('json')))
    c.header('Cache-Control', 'no-store')
    return c.json(result, 200)
  })

  routes.openapi(listCatalogRoute, async (c) => {
    const result = await executeCatalog(() => service.list(c.req.valid('query')))
    return c.json(result, 200)
  })

  routes.openapi(getCatalogProductRoute, async (c) => {
    const result = await executeCatalog(() =>
      service.getBySlug(c.req.valid('param').slug),
    )
    return c.json(result, 200)
  })

  return routes
}
