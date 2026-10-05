import { afterAll, describe, expect, test } from 'bun:test'
import { createApp } from '../../app'
import { createPrisma } from '../../db'
import { loadEnv } from '../../env'
import type { CatalogProduct } from './domain/catalog'
import { deliverRestockNotification } from './infrastructure/restock-notifications'

const url = process.env.TEST_DATABASE_URL
;(url ? describe : describe.skip)('restock requests', () => {
  const db = createPrisma(url!)
  afterAll(() => db.$disconnect())
  const env = loadEnv({ DATABASE_URL: url, JWT_SECRET: '12345678901234567890123456789012',
    CORS_ORIGINS: 'http://localhost:4334', ORDER_TELEGRAM_BOT_TOKEN: 'test-bot', ORDER_TELEGRAM_CHAT_ID: 'test-chat' })
  const product: CatalogProduct = { slug: 'source-station', name: 'Станция', category: 'stations', images: [], shortDescription: '',
    description: '', characteristics: {}, packageContents: [], warrantyMonths: 12, reviews: [], relatedProductSlugs: [], popularity: 0,
    createdAt: '2026-01-01T00:00:00.000Z', variants: [{ sku: 'RESTOCK-S1', label: '300 Вт', price: 100, availability: 'preorder' }] }
  const request = { requestId: crypto.randomUUID(), slug: product.slug, sku: 'RESTOCK-S1', channel: 'telegram', contact: '@customer_test', consent: true, website: '' }
  const api = createApp({ env, prisma: db, catalogSource: { listProducts: async () => [structuredClone(product)] } })
  const post = (body: unknown, target = api) => target.request('/api/catalog/restock', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  test('commits one durable request for concurrent retries and rechecks current stock', async () => {
    const responses = await Promise.all([post(request), post(request)])
    expect(responses.map((response) => response.status)).toEqual([202, 202])
    expect(await responses[0]!.json()).toEqual({ requestId: request.requestId, status: 'accepted' })
    const rows = await db.taskOutbox.findMany({ where: { type: 'catalog:restock-notify' } })
    expect(rows).toHaveLength(1)
    const requests = await db.restockRequest.findMany()
    expect(requests).toHaveLength(1)
    expect(rows[0]!.payload).toEqual({ id: requests[0]!.id })
    expect(requests[0]!.details).toMatchObject({ name: 'Станция', label: '300 Вт', request: { sku: 'RESTOCK-S1', contact: '@customer_test' } })
    product.variants[0]!.availability = 'in-stock'
    expect((await post({ ...request, requestId: crypto.randomUUID() })).status).toBe(409)
    product.variants[0]!.availability = 'preorder'
    expect((await post({ ...request, sku: 'MISSING' })).status).toBe(404)
    expect((await post({ ...request, consent: false })).status).toBe(400)
    expect(await db.taskOutbox.count({ where: { type: 'catalog:restock-notify' } })).toBe(1)
    await db.taskOutbox.update({ where: { id: rows[0]!.id }, data: { status: 'failed', payload: {} } })
    expect((await db.restockRequest.findUniqueOrThrow({ where: { id: requests[0]!.id } })).details).toMatchObject({ request: { contact: '@customer_test' } })
    await deliverRestockNotification({ id: requests[0]!.id }, { env, prisma: db }, new AbortController().signal,
      (async () => Response.json({ ok: true })))
    const delivered = await db.restockRequest.findUniqueOrThrow({ where: { id: requests[0]!.id } })
    expect(delivered.notifiedAt).not.toBeNull()
    expect(delivered.details).toEqual({})
  })

  test('does not accept requests when manager delivery is unconfigured or storage fails', async () => {
    const disabled = createApp({ env: { ...env, ORDER_TELEGRAM_BOT_TOKEN: undefined }, prisma: db,
      catalogSource: { listProducts: async () => [product] } })
    expect((await post(request, disabled)).status).toBe(503)
    const broken = createApp({ env, prisma: { $transaction: async () => { throw new Error('storage unavailable') } } as unknown as typeof db,
      catalogSource: { listProducts: async () => [product] } })
    expect((await post(request, broken)).status).toBe(503)
  })

  test('requires consent, blocks spam and bounds public request bodies and frequency', async () => {
    const target = createApp({ env: { ...env, ORDER_TELEGRAM_BOT_TOKEN: undefined }, prisma: db,
      catalogSource: { listProducts: async () => [product] } })
    expect((await post({ ...request, website: 'spam' }, target)).status).toBe(400)
    expect((await post({ ...request, contact: 'x'.repeat(9_000) }, target)).status).toBe(413)
    for (let attempt = 0; attempt < 4; attempt++) expect((await post(request, target)).status).toBe(503)
    expect((await post(request, target)).status).toBe(429)
  })
})
