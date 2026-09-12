import assert from 'node:assert/strict'
import test from 'node:test'
import { PRODUCTS } from '../src/features/catalog/catalog-data'
import {
  addCartItem,
  normalizeCart,
  parseCart,
  readCart,
  removeCartItem,
  saveCart,
  setCartItemQuantity,
} from '../src/lib/cart'

const product = PRODUCTS.find((item) => item.slug === 'nikass-ns-31')!
const stockSku = product.variants[0].sku

test('stores only product/variant identifiers and merges repeated additions', () => {
  let cart = addCartItem([], product, stockSku)
  cart = addCartItem(cart, product, stockSku, 2)

  assert.deepEqual(cart, [{ productSlug: product.slug, variantSku: stockSku, quantity: 3 }])
})

test('allows preorder and rejects unavailable variants', () => {
  const preorderProduct = PRODUCTS.find((item) => item.slug === 'nikass-power-50')!
  const unavailableProduct = PRODUCTS.find((item) => item.slug === 'nikass-solar-200')!

  assert.equal(addCartItem([], preorderProduct, preorderProduct.variants[0].sku).length, 1)
  assert.deepEqual(addCartItem([], unavailableProduct, unavailableProduct.variants[0].sku), [])
})

test('changes quantity and removes a line at zero', () => {
  const cart = [{ productSlug: product.slug, variantSku: stockSku, quantity: 1 }]
  const increased = setCartItemQuantity(cart, product.slug, stockSku, 4)

  assert.equal(increased[0].quantity, 4)
  assert.deepEqual(setCartItemQuantity(increased, product.slug, stockSku, 0), [])
  assert.deepEqual(removeCartItem(cart, product.slug, stockSku), [])
})

test('normalizes duplicates and ignores malformed lines', () => {
  assert.deepEqual(normalizeCart([
    { productSlug: 'a', variantSku: 'v', quantity: 1, price: 100 },
    { productSlug: 'a', variantSku: 'v', quantity: 2 },
    { productSlug: 'bad', variantSku: 'zero', quantity: 0 },
    { productSlug: 'bad', variantSku: 'nan', quantity: '2' },
  ]), [{ productSlug: 'a', variantSku: 'v', quantity: 3 }])
})

test('rejects empty, broken, and stale storage formats', () => {
  assert.deepEqual(parseCart(null), [])
  assert.deepEqual(parseCart('{broken'), [])
  assert.deepEqual(parseCart(JSON.stringify({ version: 0, items: [{ productSlug: 'a', variantSku: 'v', quantity: 1 }] })), [])
})

test('accepts the current version but strips every stored field except the cart contract', () => {
  assert.deepEqual(parseCart(JSON.stringify({
    version: 1,
    items: [{ productSlug: 'a', variantSku: 'v', quantity: 2, price: 100, name: 'stale' }],
  })), [{ productSlug: 'a', variantSku: 'v', quantity: 2 }])
})

test('reports storage failures instead of treating the cart as empty or saved', () => {
  const previousWindow = globalThis.window

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: () => { throw new Error('read denied') },
        setItem: () => { throw new Error('write denied') },
      },
      dispatchEvent: () => true,
    },
  })

  try {
    assert.equal(readCart().error, 'read-failed')
    assert.equal(saveCart([{ productSlug: 'a', variantSku: 'v', quantity: 1 }]).error, 'write-failed')
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    })
  }
})
