import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { detailRows, mapCatalogProduct, relatedProducts, selectCatalogProducts } from '../src/data/catalog'

const homepage = readFileSync(fileURLToPath(new URL('../src/pages/index.astro', import.meta.url)), 'utf8')
const homepageStyles = readFileSync(fileURLToPath(new URL('../src/styles/global.css', import.meta.url)), 'utf8')

const products = [
  mapCatalogProduct({
    slug: 'nikass-invertor-1200',
    name: 'NIKASS Инвертор 1200 Вт',
    category: 'invertory',
    images: ['https://cdn.example.com/inverter.jpg'],
    shortDescription: 'Инвертор для автомобиля',
    description: '<p>Инвертор для автомобиля.</p>',
    characteristics: { Артикул: '3204442838', Тип: 'Инвертор автомобильный', Мощность: '1200 Вт' },
    packageContents: ['Инвертор', 'Инструкция'],
    variants: [{ sku: 'WJF-1200MX', label: 'Основной вариант', price: 4333, oldPrice: 90000, availability: 'in-stock' }],
  }, ['3204442838']),
  mapCatalogProduct({
    slug: 'nikass-invertor-1600',
    name: 'NIKASS Инвертор 1600 Вт',
    category: 'invertory',
    images: [],
    shortDescription: 'Инвертор для автомобиля',
    description: 'Инвертор для автомобиля.',
    characteristics: {},
    packageContents: [],
    variants: [{ sku: '3204445652', label: 'Основной вариант', price: 6650, availability: 'in-stock' }],
  }),
]

test('maps WooCommerce products with orderable variants', () => {
  assert.equal(products.length, 2)
  assert.ok(products.every((product) => product.variants.length > 0))
  assert.ok(products.every((product) => product.variants.every((variant) =>
    ['in-stock', 'preorder', 'unavailable'].includes(variant.availability))))
  assert.equal(products[0]?.image, '/products_clean/3204442838/product.webp')
  assert.equal(products[0]?.sku, '3204442838')
  assert.equal(products[0]?.variants[0]?.sku, 'WJF-1200MX')
  assert.equal(products[1]?.image, '/products_clean/3204445652/product.webp')
})

test('keeps only the CSV-selected WooCommerce products', () => {
  const selected = selectCatalogProducts([
    {
      slug: 'keep', name: 'Keep', category: 'invertory', images: [], shortDescription: '', description: '',
      characteristics: {}, packageContents: [],
      variants: [{ sku: 'WOO-KEEP', label: 'Основной вариант', price: 1, availability: 'in-stock' }],
    },
    {
      slug: 'skip', name: 'Skip', category: 'invertory', images: [], shortDescription: '', description: '',
      characteristics: {}, packageContents: [],
      variants: [{ sku: 'WOO-SKIP', label: 'Основной вариант', price: 1, availability: 'in-stock' }],
    },
  ], { keep: ['CSV-ARTICLE', 'CSV-ALIAS'] })

  assert.deepEqual(selected.map((product) => product.slug), ['keep'])
  assert.equal(selected[0]?.sku, 'CSV-ARTICLE')
  assert.match(selected[0]?.characteristics ?? '', /CSV-ALIAS/)
  assert.equal(selected[0]?.variants[0]?.sku, 'WOO-KEEP')
})

test('related products stay in category and never include the current product', () => {
  const product = products[0]
  const related = relatedProducts(product, products)

  assert.ok(related.length > 0)
  assert.ok(related.every((item) => item.category === product.category && item.slug !== product.slug))
})

test('characteristics become name-value rows', () => {
  const rows = detailRows(products[0].characteristics)

  assert.deepEqual(rows.slice(0, 3), [
    ['Артикул', '3204442838'],
    ['Тип', 'Инвертор автомобильный'],
    ['Мощность', '1200 Вт'],
  ])
})

test('homepage CTA contracts use the system builder and chat widget', () => {
  assert.match(homepage, /<a[^>]+href="#custom"[^>]*>Подобрать решение<\/a>/)
  assert.match(homepage, /data-chat-open/)
  assert.match(homepage, /data-chat-widget/)
})

test('homepage hero exposes the four product categories', () => {
  for (const image of ['category-panels', 'category-batteries', 'category-inverters', 'category-stations']) {
    assert.match(homepage, new RegExp(`/assets/images/${image}\\.webp`))
  }
  for (const category of ['Солнечные панели', 'Аккумуляторы', 'Инверторы', 'Зарядные станции']) {
    assert.match(homepage, new RegExp(category))
  }
  assert.doesNotMatch(homepage, /heroProducts/)
  assert.match(homepage, /class="orbea-hero-products"/)
  assert.match(homepage, /class="orbea-hero-product-name"/)
  assert.match(homepage, /href={`\/catalog\?category=\$\{encodeURIComponent\(category\.category\)\}`}/)
  assert.match(homepage, /data-hero-previous/)
  assert.match(homepage, /data-hero-next/)
  assert.match(homepage, /pointerdown/)
  assert.match(homepageStyles, /data-hero-position="0"[^}]+orbea-hero-product-media[^}]+scale\(2\)/)
  assert.match(homepageStyles, /data-hero-position="-1"[^}]+opacity: \.45/)
  assert.match(homepageStyles, /data-hero-position="0"[^}]+orbea-hero-product-name[^}]+opacity: 1/)
})
