import { describe, expect, test } from 'bun:test'

import { CatalogFailure, type CatalogListQuery, type CatalogProduct } from '../domain/catalog'
import { CatalogService } from './catalog-service'

const query = (overrides: Partial<CatalogListQuery> = {}): CatalogListQuery => ({
  page: 1,
  perPage: 20,
  sort: 'popularity',
  ...overrides,
})

const product = (overrides: Partial<CatalogProduct> = {}): CatalogProduct => ({
  slug: 'station',
  name: 'NIKASS Station',
  category: 'charging-stations',
  images: [],
  shortDescription: '',
  description: '',
  characteristics: { Мощность: '300 Вт' },
  packageContents: [],
  warrantyMonths: 12,
  reviews: [],
  relatedProductSlugs: [],
  popularity: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  variants: [
    {
      sku: 'STATION-300',
      label: '300 Вт',
      price: 24990,
      availability: 'in-stock',
    },
  ],
  ...overrides,
})

describe('CatalogService', () => {
  test('caches successful reads for five minutes and serves stale data during an outage', async () => {
    let now = new Date('2026-09-08T10:00:00.000Z')
    let calls = 0
    let unavailable = false
    const service = new CatalogService({
      cacheTtlMs: 300_000,
      clock: { now: () => now },
      source: {
        listProducts: async () => {
          calls += 1
          if (unavailable) throw new CatalogFailure('unavailable', 'provider down')
          return [product()]
        },
      },
    })

    expect((await service.list(query())).stale).toBe(false)
    expect((await service.list(query())).stale).toBe(false)
    expect(calls).toBe(1)

    now = new Date(now.getTime() + 300_001)
    unavailable = true

    const stale = await service.list(query())
    expect(stale).toMatchObject({ stale: true, total: 1 })
    expect(stale.items[0]?.slug).toBe('station')
    expect(calls).toBe(2)
  })

  test('filters by category, price, SKU and characteristics, then sorts and paginates', async () => {
    const service = new CatalogService({
      cacheTtlMs: 300_000,
      clock: { now: () => new Date('2026-09-08T10:00:00.000Z') },
      source: {
        listProducts: async () => [
          product({ slug: 'power', name: 'Power 20', category: 'power-banks', popularity: 20 }),
          product({
            slug: 'solar',
            name: 'Solar 100',
            category: 'solar-panels',
            popularity: 30,
            characteristics: { Мощность: '100 Вт' },
            variants: [{ sku: 'SOLAR-100', label: '100 Вт', price: 12990, availability: 'in-stock' }],
          }),
          product({
            slug: 'multi-price',
            name: 'Multi-price',
            variants: [
              { sku: 'LOW', label: 'Low', price: 5_000, availability: 'in-stock' },
              { sku: 'HIGH', label: 'High', price: 20_000, availability: 'in-stock' },
            ],
          }),
        ],
      },
    })

    const result = await service.list(query({
      q: 'SOLAR-100',
      minPrice: 10_000,
      maxPrice: 15_000,
      category: 'solar-panels',
      sort: 'price_asc',
      perPage: 1,
    }))

    expect(result).toMatchObject({ page: 1, perPage: 1, total: 1, hasNext: false })
    expect(result.items.map(({ slug }) => slug)).toEqual(['solar'])

    const gap = await service.list(query({ minPrice: 10_000, maxPrice: 15_000 }))
    expect(gap.items.map(({ slug }) => slug)).toEqual(['solar'])
  })

  test('does not hide a cold-start provider failure', async () => {
    const service = new CatalogService({
      cacheTtlMs: 300_000,
      clock: { now: () => new Date() },
      source: {
        listProducts: async () => {
          throw new CatalogFailure('not_configured', 'not configured')
        },
      },
    })

    await expect(service.list(query())).rejects.toBeInstanceOf(CatalogFailure)
  })
})

test('cart review bypasses cached prices and refuses stale data on provider failure', async () => {
  let price = 10.15
  let down = false
  const service = new CatalogService({
    cacheTtlMs: 300_000,
    clock: { now: () => new Date() },
    source: { listProducts: async () => {
      if (down) throw new CatalogFailure('unavailable', 'offline')
      return [product({ variants: [{ sku: 'A', label: 'A', price, availability: 'preorder' }] })]
    } },
  })
  await service.list(query())
  price = 20.15
  const cart = { version: 1 as const, items: [
    { slug: 'station', sku: 'A', quantity: 3 },
    { slug: 'missing', sku: 'B', quantity: 1 },
  ] }
  expect(await service.reviewCart(cart)).toMatchObject({
    currency: 'RUB', subtotalMinor: 6045,
    items: [
      { status: 'preorder', unitPriceMinor: 2015, lineTotalMinor: 6045 },
      { status: 'missing', unitPriceMinor: null, lineTotalMinor: null },
    ],
  })
  down = true
  await expect(service.reviewCart(cart)).rejects.toBeInstanceOf(CatalogFailure)
})
