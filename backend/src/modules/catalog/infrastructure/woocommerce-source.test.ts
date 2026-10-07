import { expect, test } from 'bun:test'

import { CatalogFailure } from '../domain/catalog'
import { createWooCommerceCatalogSource, type CatalogFetch } from './woocommerce-source'

test('normalizes WooCommerce products and loads variable-product variants', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = []
  const fetchImpl: CatalogFetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init: init ?? {} })

    if (url.includes('/42/variations')) {
      return new Response(
        JSON.stringify([
          {
            id: 101,
            sku: 'NS31-300-288',
            price: '24990',
            regular_price: '29990',
            sale_price: '24990',
            stock_status: 'instock',
            attributes: [{ name: 'Мощность', option: '300 Вт' }],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify([
        {
          id: 42,
          name: 'NIKASS NS-31',
          slug: 'nikass-ns-31',
          type: 'variable',
          sku: '',
          price: '',
          regular_price: '',
          sale_price: '',
          stock_status: 'instock',
          date_created: '2026-01-02T00:00:00',
          categories: [{ slug: 'charging-stations', name: 'Зарядные станции' }],
          images: [{ src: 'https://cdn.example.com/ns31.jpg' }],
          attributes: [{ name: 'Ёмкость', options: ['288 Вт·ч'] }],
          variations: [101],
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const source = createWooCommerceCatalogSource(
    {
      productsEndpoint: 'https://woo.example.com/wp-json/wc/v3/products',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      requestTimeoutMs: 1_000,
    },
    fetchImpl,
  )

  const [normalized] = await source.listProducts()

  expect(normalized).toMatchObject({
    slug: 'nikass-ns-31',
    category: 'charging-stations',
    images: ['https://cdn.example.com/ns31.jpg'],
    characteristics: { Ёмкость: '288 Вт·ч' },
    variants: [
      {
        sku: 'NS31-300-288',
        price: 24990,
        oldPrice: 29990,
        availability: 'in-stock',
        label: 'Мощность: 300 Вт',
      },
    ],
  })
  expect(requests).toHaveLength(2)
  expect(requests[0]?.url).toContain('per_page=100')
  expect(requests[0]?.url).not.toContain('ck_test')
  expect(requests[0]?.init.headers).toMatchObject({
    Authorization: `Basic ${btoa('ck_test:cs_test')}`,
  })
})

test('turns provider HTTP failures into a recoverable catalog failure', async () => {
  const source = createWooCommerceCatalogSource(
    {
      productsEndpoint: 'https://woo.example.com/products',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      requestTimeoutMs: 1_000,
    },
    (async () => new Response('upstream error', { status: 503 })) as CatalogFetch,
  )

  await expect(source.listProducts()).rejects.toMatchObject({ kind: 'unavailable' } satisfies Partial<CatalogFailure>)
})

test('reads specifications, package contents, gifts and warranty from WooCommerce attributes', async () => {
  const source = createWooCommerceCatalogSource({
    productsEndpoint: 'https://woo.example.com/products', consumerKey: 'ck_test',
    consumerSecret: 'cs_test', requestTimeoutMs: 1_000,
  }, async () => Response.json([{
    id: 814, slug: 'station', name: 'NS-54', sku: 'SL-54', price: '10000',
    attributes: [
      { name: 'Ёмкость', options: ['153,6 Вт·ч'] },
      { name: 'USB-A', options: ['QC 3.0, 18 Вт', '5 В / 2,4 А'] },
      { name: 'Комплектация', options: ['Станция, адаптер, инструкция'] },
      { name: 'Дополнительные опции — подарок от продавца', options: ['2 LED-светильника'] },
      { name: 'Гарантия', options: ['2 года со дня продажи'] },
    ],
  }]))
  const [product] = await source.listProducts()
  expect(product.characteristics).toEqual({ Ёмкость: '153,6 Вт·ч', 'USB-A': 'QC 3.0, 18 Вт, 5 В / 2,4 А' })
  expect(product.packageContents).toEqual(['Станция, адаптер, инструкция', 'Дополнительные опции — подарок от продавца: 2 LED-светильника'])
  expect(product.warranty).toBe('2 года со дня продажи')
  expect(product.warrantyMonths).toBeUndefined()
})

test('recognizes discounted stock in any category position and preserves its own SKU, prices and photos', async () => {
  const source = createWooCommerceCatalogSource({
    productsEndpoint: 'https://woo.example.com/products', consumerKey: 'ck_test',
    consumerSecret: 'cs_test', requestTimeoutMs: 1_000,
  }, async () => Response.json([{
    id: 43, name: 'Уценённая станция', slug: 'station-outlet', sku: 'NS-31-OUTLET-1',
    price: '8000', regular_price: '10000', sale_price: '8000', stock_status: 'instock',
    categories: [{ slug: 'charging-stations' }, { slug: 'ucenennye-tovary', name: 'Уценённые товары' }],
    images: [{ src: 'https://cdn.example.com/station.jpg' }, { src: 'https://cdn.example.com/defect.jpg' }],
    attributes: [{ name: 'Дефекты', options: ['Царапина на корпусе'] }],
  }]))
  const [product] = await source.listProducts()
  expect(product).toMatchObject({
    discounted: true, category: 'charging-stations',
    characteristics: { Дефекты: 'Царапина на корпусе' },
    images: ['https://cdn.example.com/station.jpg', 'https://cdn.example.com/defect.jpg'],
    variants: [{ sku: 'NS-31-OUTLET-1', price: 8000, oldPrice: 10000 }],
  })
})

test('maps zero-stock products to the restock-request preorder state', async () => {
  const source = createWooCommerceCatalogSource({
    productsEndpoint: 'https://woo.example.com/products', consumerKey: 'ck_test',
    consumerSecret: 'cs_test', requestTimeoutMs: 1_000,
  }, async () => Response.json([
    { id: 44, name: 'Нет остатка', slug: 'zero-stock', sku: 'ZERO', price: '100', stock_status: 'outofstock' },
    { id: 45, name: 'Есть остаток', slug: 'in-stock', sku: 'AVAILABLE', price: '100', stock_status: 'instock' },
  ]))

  const products = await source.listProducts()

  expect(products.map(({ variants }) => variants[0]?.availability)).toEqual(['preorder', 'in-stock'])
})
