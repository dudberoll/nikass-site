import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { detailRows, HERO_CATEGORIES, mapCatalogProduct, relatedProducts, selectCatalogProducts } from '../src/data/catalog'

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
  assert.equal(products[0]?.image, 'https://cdn.example.com/inverter.jpg')
  assert.equal(products[0]?.sku, '3204442838')
  assert.equal(products[0]?.variants[0]?.sku, 'WJF-1200MX')
  assert.equal(products[1]?.image, '/assets/images/gear-menu.webp')
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
    ['Тип товара', 'Автомобильный инвертор 12 В DC → 220 В AC'],
    ['Модель', 'WJF-1200MX'],
  ])
})

test('homepage CTA contracts use the system builder and chat widget', () => {
  assert.match(homepage, /<a[^>]+href="#custom"[^>]*>Подобрать решение<\/a>/)
  assert.match(homepage, /data-chat-open/)
  assert.match(homepage, /class="orbea-chat-widget is-minimized"[^>]*data-chat-widget/)
  assert.match(homepage, /aria-label="Открыть чат" data-chat-restore/)
})

test('homepage bestsellers use the first four Drive model series', () => {
  assert.match(homepage, /const bestSellerSlugs = \[[\s\S]*?portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah[\s\S]*?portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh[\s\S]*?portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2[\s\S]*?portativnaya-elektrostantsiya-168000-mah-600w/)
  assert.match(homepage, /const bestSellers = bestSellerSlugs\.flatMap\(/)
})

test('homepage hero exposes the supplied categories in the requested order', () => {
  assert.equal(HERO_CATEGORIES.length, 8)
  assert.deepEqual(HERO_CATEGORIES.map(({ title }) => title), [
    'ПОРТАТИВНЫЕ ЗАРЯДНЫЕ СТАНЦИИ',
    'AGM АККУМУЛЯТОРЫ',
    'LiFePO4 АККУМУЛЯТОРЫ',
    'ИНВЕРТОРА НАПРЯЖЕНИЯ',
    'ГИБРИДНЫЕ ИНВЕРТОРЫ',
    'СИСТЕМЫ ХРАНЕНИЯ ЭНЕРГИИ ESS',
    'СОЛНЕЧНЫЕ ПАНЕЛИ',
    'POWERBANK',
  ])
  assert.deepEqual(HERO_CATEGORIES.map(({ label }) => label), [
    'Портативные зарядные станции',
    'AGM аккумуляторы',
    'LiFePO₄ аккумуляторы',
    'Инвертора напряжения',
    'Гибридные инверторы',
    'Системы хранения энергии ESS',
    'Солнечные панели',
    'POWERBANK',
  ])
  assert.match(homepage, /const heroCategories = HERO_CATEGORIES/)
  assert.match(homepage, /const heroInitialIndex = 0/)
  assert.doesNotMatch(homepage, /heroProducts/)
  assert.match(homepage, /class="orbea-hero-products"/)
  assert.match(homepage, /class="orbea-hero-product-name"/)
  assert.match(homepage, /href={`\/catalog\?category=\$\{encodeURIComponent\(category\.title\)\}`}/)
  assert.match(homepage, /data-hero-previous/)
  assert.match(homepage, /data-hero-next/)
  assert.match(homepage, /pointerdown/)
  assert.match(homepageStyles, /data-hero-position="0"[^}]+orbea-hero-product-media[^}]+scale\(2\)/)
  assert.match(homepageStyles, /data-hero-position="-1"[^}]+opacity: \.45/)
  assert.match(homepageStyles, /data-hero-position="0"[^}]+orbea-hero-product-name[^}]+opacity: 1/)
})

test('homepage hero auto-advances generically on desktop', () => {
  assert.match(homepage, /heroCarousel\.addEventListener\("animationend"/)
  assert.match(homepage, /heroCarousel\.classList\.add\("is-hero-auto-hint"\)/)
  assert.match(homepage, /matchMedia\("\(min-width: 1024px\)"\)/)
  assert.match(homepage, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/)
  assert.match(homepageStyles, /@keyframes orbea-hero-auto-nudge/)
  assert.match(homepageStyles, /orbea-hero-auto-nudge 1s/)
  assert.match(homepageStyles, /transition: transform 1\.5s/)
  assert.match(homepage, /scheduleHeroAutoAdvance\(4000\)/)
  assert.match(homepageStyles, /@media \(min-width: 1024px\) and \(prefers-reduced-motion: no-preference\)/)
})
