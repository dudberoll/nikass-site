import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  AVAILABILITY_LABELS,
  CATEGORIES,
  MOCK_PRODUCTS as PRODUCTS,
  formatPrice,
  getStartingPrice,
} from '../src/features/catalog/catalog-data'
import {
  CATALOG_PAGE_SIZE,
  filterAndSortProducts,
  filterProducts,
  getCharacteristicFilters,
  getPriceBounds,
  paginateProducts,
  sortProducts,
} from '../src/features/catalog/catalog-filters'

test('mock catalog covers five categories and all availability states', () => {
  assert.equal(CATEGORIES.length, 5)
  assert.deepEqual(new Set(PRODUCTS.map((product) => product.category)).size, 5)

  const states = new Set(PRODUCTS.flatMap((product) => product.variants.map((variant) => variant.availability)))
  assert.deepEqual(states, new Set(['in-stock', 'preorder', 'unavailable']))
  assert.ok(PRODUCTS.some((product) => product.variants.length > 1))
  assert.ok(PRODUCTS.some((product) => product.variants.some((variant) => variant.oldPrice)))
})

test('each mock product contains the fields needed by a public catalog card', () => {
  for (const product of PRODUCTS) {
    assert.ok(product.slug)
    assert.ok(product.name)
    assert.ok(product.images.every((image) => image.startsWith('/catalog/')))
    assert.ok(product.shortDescription)
    assert.ok(product.description)
    assert.ok(Object.keys(product.characteristics).length > 0)
    assert.ok(product.packageContents.length > 0)
    assert.equal(product.warrantyMonths, 12)
    assert.ok(product.reviews.length > 0)
    assert.ok(product.variants.every((variant) => variant.sku && variant.price > 0))
  }
})

test('prices stay numeric in the model and are formatted only for output', () => {
  const product = PRODUCTS[0]
  const price = getStartingPrice(product)

  assert.equal(typeof price, 'number')
  assert.match(formatPrice(price), /24\s?990\s?₽/)
  assert.equal(AVAILABILITY_LABELS['preorder'], 'Предзаказ')
})

test('empty catalog bounds stay finite and products without variants sort safely', () => {
  assert.deepEqual(getPriceBounds([]), { min: 0, max: 0 })
  assert.equal(getStartingPrice({ ...PRODUCTS[0], variants: [] }), 0)
})

test('search matches product names, variant SKUs, and characteristic values', () => {
  const filters = (query: string) => ({
    query,
    category: 'all' as const,
    characteristics: {},
  })

  assert.deepEqual(filterProducts(PRODUCTS, filters('NS-31')).map((product) => product.slug), ['nikass-ns-31'])
  assert.deepEqual(filterProducts(PRODUCTS, filters('P20-22-5')).map((product) => product.slug), ['nikass-power-20'])
  assert.deepEqual(filterProducts(PRODUCTS, filters('чистая синусоида')).map((product) => product.category), ['inverters', 'inverters'])
})

test('category, price, and applicable characteristic filters narrow the catalog', () => {
  const categoryFilters = getCharacteristicFilters(PRODUCTS, 'charging-stations')
  const powerFilter = categoryFilters.find(({ key }) => key === 'Мощность')

  assert.deepEqual(powerFilter?.values, ['300 Вт', '600 Вт'])
  assert.deepEqual(filterProducts(PRODUCTS, {
    query: '',
    category: 'charging-stations',
    minPrice: 45000,
    maxPrice: 50000,
    characteristics: { Мощность: '600 Вт' },
  }).map((product) => product.slug), ['nikass-ns-63'])
})

test('sorting uses popularity by default, numeric prices, and newest dates without mutating input', () => {
  const original = PRODUCTS.slice()

  assert.equal(sortProducts(PRODUCTS, 'popularity')[0].slug, 'nikass-ns-31')
  assert.equal(sortProducts(PRODUCTS, 'price-asc')[0].slug, 'nikass-power-20')
  assert.equal(sortProducts(PRODUCTS, 'price-desc')[0].slug, 'nikass-ns-63')
  assert.equal(sortProducts(PRODUCTS, 'newest')[0].slug, 'nikass-inverter-3000')
  assert.deepEqual(PRODUCTS, original)
})

test('a query with no matches returns an empty result set', () => {
  assert.deepEqual(filterAndSortProducts(PRODUCTS, {
    query: 'не существующий товар',
    category: 'all',
    characteristics: {},
  }, 'popularity'), [])
})

test('catalog pagination keeps the first page small and exposes the next page', () => {
  const firstPage = paginateProducts(PRODUCTS, 1, CATALOG_PAGE_SIZE)
  const secondPage = paginateProducts(PRODUCTS, 2, CATALOG_PAGE_SIZE)

  assert.equal(firstPage.items.length, CATALOG_PAGE_SIZE)
  assert.equal(firstPage.pageCount, 2)
  assert.equal(firstPage.hasNext, true)
  assert.equal(secondPage.page, 2)
  assert.equal(secondPage.hasNext, false)
  assert.deepEqual(secondPage.items.map(({ slug }) => slug), PRODUCTS.slice(CATALOG_PAGE_SIZE).map(({ slug }) => slug))
})
