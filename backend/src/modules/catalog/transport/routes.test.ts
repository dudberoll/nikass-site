import { expect, test } from 'bun:test'

import type { DbClient } from '../../../db'
import { createApp } from '../../../app'
import { loadEnv } from '../../../env'
import type { CatalogProduct } from '../domain/catalog'

const env = loadEnv({
  DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
  JWT_SECRET: '12345678901234567890123456789012',
  CORS_ORIGINS: 'http://localhost:5173',
})

const catalogProduct: CatalogProduct = {
  slug: 'nikass-ns-31',
  name: 'NIKASS NS-31',
  category: 'charging-stations',
  images: ['https://cdn.example.com/ns31.jpg'],
  shortDescription: 'Компактная станция',
  description: 'Описание',
  characteristics: { Мощность: '300 Вт' },
  packageContents: ['Станция'],
  warrantyMonths: 12,
  reviews: [],
  relatedProductSlugs: [],
  popularity: 98,
  createdAt: '2026-01-02T00:00:00.000Z',
  variants: [
    { sku: 'NS31-300-288', label: '300 Вт', price: 24990, availability: 'in-stock' },
  ],
}

const source = {
  listProducts: async () => [catalogProduct],
}

function app() {
  return createApp({
    catalogSource: source,
    env,
    prisma: { $queryRaw: async () => [{ '?column?': 1 }] } as unknown as DbClient,
  })
}

test('exposes the public catalog list and product routes', async () => {
  const api = app()

  const list = await api.request('/api/catalog?perPage=1')
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({
    items: [{ slug: 'nikass-ns-31' }],
    page: 1,
    perPage: 1,
    total: 1,
    stale: false,
  })

  const detail = await api.request('/api/catalog/nikass-ns-31')
  expect(detail.status).toBe(200)
  expect(await detail.json()).toMatchObject({ product: { slug: 'nikass-ns-31' } })
})

test('rejects invalid catalog queries and reports missing products', async () => {
  const api = app()

  const invalid = await api.request('/api/catalog?minPrice=20000&maxPrice=10000')
  expect(invalid.status).toBe(400)

  const missing = await api.request('/api/catalog/does-not-exist')
  expect(missing.status).toBe(404)
  expect((await missing.json()).error.code).toBe('NOT_FOUND')
})

test('returns a clear unavailable response while the catalog provider is disabled', async () => {
  const api = createApp({
    env,
    prisma: {} as DbClient,
  })

  const response = await api.request('/api/catalog')
  expect(response.status).toBe(503)
  expect((await response.json()).error.message).toContain('not configured')
})

test('reviews a cart over HTTP and rejects prices, duplicate items and invalid quantities', async () => {
  const api = app()
  const item = { slug: 'nikass-ns-31', sku: 'NS31-300-288', quantity: 2 }
  const post = (body: unknown) => api.request('/api/catalog/cart/review', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const response = await post({ version: 1, items: [item] })
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toMatchObject({ subtotalMinor: 4998000 })
  for (const items of [[{ ...item, price: 1 }], [item, item], [{ ...item, quantity: 0 }], []]) {
    expect((await post({ version: 1, items })).status).toBe(400)
  }
})
