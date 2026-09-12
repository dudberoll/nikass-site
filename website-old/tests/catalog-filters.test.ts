import assert from 'node:assert/strict'
import test from 'node:test'

import { PRODUCTS } from '../src/features/catalog/catalog-data'
import { filterAndSortProducts } from '../src/features/catalog/catalog-filters'

test('price filters match the starting price shown in each card', () => {
  const products = filterAndSortProducts(PRODUCTS, {
    query: '',
    category: 'all',
    minPrice: 40000,
    maxPrice: 50000,
    characteristics: {},
  }, 'popularity')

  assert.deepEqual(products.map(({ slug }) => slug), ['nikass-ns-63'])
})
