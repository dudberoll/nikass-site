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
