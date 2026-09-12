import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PRODUCTS } from '../src/features/catalog/catalog-data'
import { getSelectedVariant, isVariantAddable } from '../src/features/catalog/product-variants'

test('variant selection uses the requested SKU and keeps price/status data together', () => {
  const product = PRODUCTS[0]
  const initial = getSelectedVariant(product)
  const preorder = getSelectedVariant(product, 'NS31-600-576')

  assert.equal(initial?.sku, 'NS31-300-288')
  assert.equal(initial?.price, 24990)
  assert.equal(initial?.oldPrice, 29990)
  assert.equal(initial?.availability, 'in-stock')
  assert.equal(preorder?.sku, 'NS31-600-576')
  assert.equal(preorder?.price, 45990)
  assert.equal(preorder?.oldPrice, undefined)
  assert.equal(preorder?.availability, 'preorder')
})

test('unavailable variants remain visible but cannot be added', () => {
  const product = PRODUCTS.find((item) => item.slug === 'nikass-solar-200')!
  const unavailable = getSelectedVariant(product, 'SOL200-MC4')

  assert.ok(unavailable)
  assert.equal(unavailable.sku, 'SOL200-MC4')
  assert.equal(isVariantAddable(unavailable), false)
  assert.equal(isVariantAddable(PRODUCTS[0].variants[0]), true)
})
