import { expect, test } from 'bun:test'
import { catalogAvailabilityResponseSchema, catalogBuildResponseSchema, type CatalogAvailabilityResponse } from './index'

const response: CatalogAvailabilityResponse = {
  items: [{ slug: 'station', variants: [
    { sku: 'S1', availability: 'in-stock' },
    { sku: 'S2', availability: 'preorder' },
    { sku: 'S3', availability: 'unavailable' },
  ] }],
  cachedAt: '2026-10-07T10:00:00.000Z',
  stale: false,
}

test('validates the compact catalog availability response and rejects unexpected data', () => {
  expect(catalogAvailabilityResponseSchema.parse(response)).toEqual(response)
  for (const invalid of [
    { ...response, extra: true },
    { ...response, cachedAt: 'not-a-date' },
    { ...response, items: [{ slug: 'station', variants: [{ sku: 'S1', availability: 'sold-out' }] }] },
    { ...response, items: [{ slug: 'station', variants: [{ sku: 'S1', availability: 'in-stock', price: 100 }] }] },
  ]) {
    expect(catalogAvailabilityResponseSchema.safeParse(invalid).success).toBe(false)
  }
})


test('website builds reject stale or empty catalogs and persist only public product fields', () => {
  const item = { slug: 'panel', name: 'Panel', category: 'panels', images: ['/panel.webp'],
    shortDescription: '', description: '', characteristics: {}, packageContents: [],
    variants: [{ sku: 'SP-30', label: '30 W', price: 2650, availability: 'in-stock', salesMode: 'manager' }],
    internalNote: 'must not be published',
  }
  const parsed = catalogBuildResponseSchema.parse({ items: [item], stale: false, privateData: 'omit' })
  expect('privateData' in parsed).toBe(false)
  expect('internalNote' in parsed.items[0]!).toBe(false)
  expect(catalogBuildResponseSchema.safeParse({ items: [item], stale: true }).success).toBe(false)
  expect(catalogBuildResponseSchema.safeParse({ items: [], stale: false }).success).toBe(false)
})
