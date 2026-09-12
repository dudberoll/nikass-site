import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PRODUCTS } from '../src/features/catalog/catalog-data'
import { addCartItem } from '../src/lib/cart'

test('WooCommerce product snapshot preserves its SKU and can enter the local cart', () => {
  const product = PRODUCTS.find(p => p.slug === 'portativnaya-zaryadnaya-stantsiya-300w')!
  assert.equal(product.variants[0].price, 21975)
  assert.equal(product.variants[0].availability, 'in-stock')
  assert.deepEqual(addCartItem([], product, 'TESTAGM10012'), [
    { productSlug: product.slug, variantSku: 'TESTAGM10012', quantity: 1 },
  ])
})
