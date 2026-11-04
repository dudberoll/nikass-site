import { expect, test } from 'bun:test'

import { loadEnv } from '../../env'

const base = {
  DATABASE_URL: 'postgresql://superuser:superpassword@localhost:54329/web_app_demo',
  JWT_SECRET: '12345678901234567890123456789012',
}

test('snapshot mode needs no WooCommerce credentials and rejects ignored legacy keys', () => {
  expect(loadEnv({ ...base, CATALOG_PROVIDER: 'snapshot' }).CATALOG_PROVIDER).toBe('snapshot')
  expect(() => loadEnv({ ...base, CATALOG_PROVIDER: 'snapshot',
    WOOCOMMERCE_CONSUMER_KEY: 'ck_unused' })).toThrow('WOOCOMMERCE_CONSUMER_KEY')
})

test('keeps the catalog disabled until all WooCommerce settings are supplied', () => {
  expect(loadEnv(base).CATALOG_PROVIDER).toBe('disabled')

  expect(() => loadEnv({ ...base, CATALOG_CACHE_TTL_SECONDS: '301' })).toThrow(
    'CATALOG_CACHE_TTL_SECONDS',
  )
  expect(() => loadEnv({ ...base, CATALOG_PROVIDER: 'woocommerce' })).toThrow(
    'WOOCOMMERCE_PRODUCTS_ENDPOINT',
  )
  expect(() =>
    loadEnv({
      ...base,
      CATALOG_PROVIDER: 'woocommerce',
      WOOCOMMERCE_PRODUCTS_ENDPOINT: 'ftp://woo.example.com/products',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    }),
  ).toThrow('WOOCOMMERCE_PRODUCTS_ENDPOINT')

  expect(
    loadEnv({
      ...base,
      CATALOG_PROVIDER: 'woocommerce',
      WOOCOMMERCE_PRODUCTS_ENDPOINT: 'https://woo.example.com/wp-json/wc/v3/products',
      WOOCOMMERCE_CONSUMER_KEY: 'ck_test',
      WOOCOMMERCE_CONSUMER_SECRET: 'cs_test',
    }).CATALOG_PROVIDER,
  ).toBe('woocommerce')
})
