import { expect, test } from 'bun:test'
import { CatalogService } from '../application/catalog-service'
import { RestockService } from '../application/restock-service'
import { snapshotCatalogSource } from './snapshot-source'

test('restock requests validate against the local snapshot without an external provider', async () => {
  const products = await snapshotCatalogSource.listProducts()
  const product = products.find((item) => item.variants.some((variant) => variant.availability === 'preorder'))!
  const variant = product.variants.find((item) => item.availability === 'preorder')!
  const catalog = new CatalogService({ source: snapshotCatalogSource, cacheTtlMs: 60_000,
    clock: { now: () => new Date() } })
  let queued = false
  const restock = new RestockService(catalog, true, async (notification) => {
    expect(notification.name).toBe(product.name)
    expect(notification.label).toBe(variant.label)
    queued = true
  })
  const result = await restock.request({ requestId: crypto.randomUUID(), slug: product.slug,
    sku: variant.sku, channel: 'telegram', contact: '@snapshot_test', consent: true, website: '' })
  expect(result.status).toBe('accepted')
  expect(queued).toBe(true)
})
