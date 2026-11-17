import { expect, test } from 'bun:test'
import { catalogWebsiteRevision } from './website-publication'

test('catalog revisions survive PostgreSQL JSONB object-key reordering', () => {
  const before = { items: [{ name: 'Panel', characteristics: { power: '30 W', weight: '1 kg' }, variants: [{ sku: 'SP-30', price: 2650 }] }], stale: false }
  const stored = { stale: false, items: [{ variants: [{ price: 2650, sku: 'SP-30' }], characteristics: { weight: '1 kg', power: '30 W' }, name: 'Panel' }] }
  expect(catalogWebsiteRevision(before, 'source')).toBe(catalogWebsiteRevision(stored, 'source'))
  stored.items[0]!.variants[0]!.price = 2700
  expect(catalogWebsiteRevision(before, 'source')).not.toBe(catalogWebsiteRevision(stored, 'source'))
  expect(catalogWebsiteRevision(before, 'source')).not.toBe(catalogWebsiteRevision(before, 'other-source'))
})
