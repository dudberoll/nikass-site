import { expect, test } from 'bun:test'
import { catalogAvailabilityResponseSchema } from './index'

const response = {
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
