import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { detailRows, products, relatedProducts } from '../src/data/catalog'

const homepage = readFileSync(fileURLToPath(new URL('../src/pages/index.astro', import.meta.url)), 'utf8')

test('keeps all 24 Astra products with orderable variants', () => {
  assert.equal(products.length, 24)
  assert.ok(products.every((product) => product.variants.length > 0))
  assert.ok(products.every((product) => product.variants.every((variant) =>
    ['in-stock', 'preorder', 'unavailable'].includes(variant.availability))))
})

test('related products stay in category and never include the current product', () => {
  const product = products[0]
  const related = relatedProducts(product)

  assert.ok(related.length > 0)
  assert.ok(related.every((item) => item.category === product.category && item.slug !== product.slug))
})

test('characteristics become name-value rows', () => {
  const rows = detailRows(products[0].characteristics)

  assert.deepEqual(rows.slice(0, 3), [
    ['Артикул', '3204442838'],
    ['Тип', 'Инвертор автомобильный'],
    ['Партномер (артикул производителя)', '1200'],
  ])
})

test('homepage CTA contracts use the existing stories block and chat widget', () => {
  assert.match(homepage, /<a[^>]+href="#stories"[^>]*>Подобрать решение<\/a>/)
  assert.match(homepage, /data-chat-open/)
  assert.match(homepage, /data-chat-widget/)
})
