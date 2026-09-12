import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// Run after bun run build:website; this test never rebuilds or contacts the network.
const dist = fileURLToPath(new URL('../dist/', import.meta.url))

test('legacy Apple routes ship readable HTML, hydration, local navigation and all referenced images', () => {
  for (const [route, heading] of [
    ['uk/store/index.html', 'The best way to buy the products you love.'],
    ['uk/shop/buy-mac/index.html', 'Shop Mac'],
  ]) {
    const html = readFileSync(resolve(dist, route), 'utf8')
    assert.match(html, new RegExp(`<h1[^>]*>${heading}`), `${route}: heading must exist before JS`)
    assert.match(html, /<html lang="en-GB"/)
    assert.match(html, /client="load"/)
    assert.match(html, /href="\/uk\/store"/)
    assert.match(html, /href="\/uk\/shop\/buy-mac"/)
    assert.match(html, /aria-roledescription="carousel"/)
    assert.doesNotMatch(html, /\/_next\//)
    const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
    assert.ok(images.length > 0, `${route}: expected product images`)
    for (const [, src] of images) {
      assert.ok(src.startsWith('/sites/'), `${route}: image must be local: ${src}`)
      assert.ok(existsSync(resolve(dist, src.slice(1))), `${route}: missing image ${src}`)
    }
  }
})

test('NIKASS home ships localized readable HTML', () => {
  const html = readFileSync(resolve(dist, 'index.html'), 'utf8')

  assert.match(html, /<html lang="ru"/)
  assert.match(html, /<title>NIKASS — энергия для автономной жизни<\/title>/)
  assert.match(html, /<h1[^>]*>Независимость<br><em>в каждом ватте\.<\/em><\/h1>/)
  assert.match(html, /<footer class="catalog-footer">/)
  assert.match(html, /href="\/catalog"/)
  assert.match(html, /href="\/cart"/)
  assert.doesNotMatch(html, /checkout|data-add-to-cart/)
})

test('NIKASS cart route ships an SSR loading state and shared navigation', () => {
  const html = readFileSync(resolve(dist, 'cart/index.html'), 'utf8')

  assert.match(html, /<html lang="ru"/)
  assert.match(html, /<h1[^>]*>Загружаем корзину…<\/h1>/)
  assert.match(html, /href="\/"/)
  assert.match(html, /href="\/catalog"/)
  assert.match(html, /href="\/cart"/)
  assert.match(html, /<footer class="catalog-footer">/)
  assert.match(html, /aria-label="Нижняя навигация"/)
  assert.match(html, /data-cart-count/)
  assert.match(html, /data-cart-loading/)
  assert.match(html, /client="load"/)
})

test('NIKASS product page ships complete readable SEO content', () => {
  const html = readFileSync(resolve(dist, 'catalog/nikass-ns-31/index.html'), 'utf8')

  assert.match(html, /<html lang="ru"/)
  assert.match(html, /<title>NIKASS NS-31 — NIKASS<\/title>/)
  assert.match(html, /<meta property="og:title" content="NIKASS NS-31 — NIKASS"/)
  assert.match(html, /<h1[^>]*>NIKASS NS-31<\/h1>/)
  for (const text of [
    'Зарядные станции',
    'Компактная станция для рабочих мест, поездок и дачи.',
    'Тихая зарядная станция для ноутбука, света, роутера и небольшой бытовой техники.',
    'Мощность',
    '300 Вт',
    'Сетевой кабель',
    'Гарантия 12 месяцев',
    'PDF-инструкция',
    'Сертификат соответствия',
    'Алексей',
    'С этим товаром покупают.',
    'NIKASS NS-63',
    'NS31-300-288',
    'NS31-600-576',
    '24 990 ₽',
    '29 990 ₽',
    '45 990 ₽',
    'В наличии',
    'Предзаказ',
  ]) {
    assert.ok(html.includes(text), `product: missing ${text}`)
  }
  assert.match(html, /Акция[\s\S]*31 декабря 2026/)
  assert.match(html, /data-product-sku/)
  assert.match(html, /data-product-price/)
  assert.match(html, /data-product-old-price/)
  assert.match(html, /data-cart-stage="ready"/)
  assert.doesNotMatch(html, /data-cart-stage="ready"[^>]+disabled/)
})

test('NIKASS unavailable product blocks adding while showing the reason in server HTML', () => {
  const html = readFileSync(resolve(dist, 'catalog/nikass-agm-200/index.html'), 'utf8')

  assert.match(html, /Недоступен/)
  assert.match(html, /data-cart-stage="blocked"/)
  assert.match(html, /product-variant-selector__add[^>]+disabled/)
})

test('NIKASS catalog ships localized SEO HTML and local product assets', () => {
  const html = readFileSync(resolve(dist, 'catalog/index.html'), 'utf8')

  assert.match(html, /<html lang="ru"/)
  assert.match(html, /<title>Каталог NIKASS — электроника для автономной жизни<\/title>/)
  assert.match(
    html,
    /<meta name="description" content="Зарядные станции, Power Bank, солнечные панели, инверторы и AGM-аккумуляторы NIKASS\."/,
  )
  assert.match(html, /<h1[^>]*>Энергия для/)
  assert.match(html, /<main id="main-content">/)
  assert.match(html, /<footer class="catalog-footer">/)
  assert.equal((html.match(/data-slot="card"/g) ?? []).length, 6)
  assert.match(html, /id="catalog-variant-nikass-ns-31"/)
  assert.match(html, /data-cart-stage="ready"/)
  assert.match(html, /data-cart-variant-sku="NS31-300-288"/)

  for (const name of ['Зарядные станции', 'Power Bank', 'Солнечные панели', 'Инверторы', 'AGM-аккумуляторы']) {
    assert.ok(html.includes(name), `catalog: missing category ${name}`)
  }

  for (const name of [
    'NIKASS NS-31',
    'NIKASS NS-63',
    'NIKASS Power 20',
    'NIKASS Power 50',
    'NIKASS Solar 100',
    'NIKASS Solar 200',
  ]) {
    assert.ok(html.includes(name), `catalog: missing product ${name}`)
  }

  for (const price of ['24 990', '49 990', '4 990', '8 990', '12 990']) {
    assert.ok(html.includes(`${price} ₽`), `catalog: missing price ${price}`)
  }

  for (const status of ['В наличии', 'Предзаказ']) {
    assert.ok(html.includes(status), `catalog: missing availability ${status}`)
  }

  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(([, src]) => src)
  assert.ok(images.some((src) => src.startsWith('/catalog/')), 'catalog: expected local product assets')
  for (const src of images.filter((src) => src.startsWith('/catalog/'))) {
    assert.ok(existsSync(resolve(dist, src.slice(1))), `catalog: missing image ${src}`)
  }
})

test('NIKASS catalog ships accessible HTML pagination pages', () => {
  const html = readFileSync(resolve(dist, 'catalog/page/2/index.html'), 'utf8')

  assert.match(html, /<h1[^>]*>Каталог NIKASS<\/h1>/)
  assert.equal((html.match(/data-slot="card"/g) ?? []).length, 5)
  assert.match(html, /NIKASS Inverter 1600/)
  assert.match(html, /NIKASS AGM 200/)
  assert.match(html, /Недоступен/)
  assert.match(html, /<nav class="catalog-pagination" aria-label="Страницы каталога">/)
  assert.match(html, /href="\/catalog">1<\/a>/)
  assert.match(html, /href="\/catalog\/page\/2" aria-current="page">2<\/a>/)
})
