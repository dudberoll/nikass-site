import { expect, test } from 'bun:test'
import { createWooCommerceOrders } from './woocommerce-orders'
import { OrderFailure } from '../application/ports'
import type { OrderQuoteRequest } from '@web-app-demo/contracts'

const input: OrderQuoteRequest = { cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 2 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '5', postcode: '123456', comment: 'Позвонить', consent: true }, promoCode: 'sale10' }
const config = { productsEndpoint: 'https://shop.example.test/wp-json/wc/v3/products', storeEndpoint: 'https://shop.example.test/wp-json/wc/store/v1', consumerKey: 'test', consumerSecret: 'test', timeoutMs: 1000 }
const cart = { items: [{ id: 1, sku: 'S1', name: 'Station', quantity: 2, totals: { line_total: '1800', line_total_tax: '0' } }], totals: { currency_code: 'RUB', currency_minor_unit: 2, total_price: '1800', total_discount: '200', total_discount_tax: '0', total_shipping: '0', total_shipping_tax: '0' }, shipping_rates: [{ package_id: 0, shipping_rates: [{ rate_id: 'local_pickup:1', method_id: 'local_pickup', price: '0' }] }], errors: [] }

test('uses native WooCommerce coupon/stock validation, zero-priced shipping and confirmed total', async () => {
  let reads = 0
  const calls: { url: URL; body: any; headers: Headers }[] = []
  const provider = createWooCommerceOrders(config, (async (url: URL, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body, headers: new Headers(init.headers) })
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/orders')) return Response.json({ id: 12, number: 'N-12', status: 'pending' })
    return Response.json(url.pathname.endsWith('/cart') && reads++ === 0 ? { items: [] } : cart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)
  const quote = await provider.quote(input)
  expect(quote.totals).toMatchObject({ totalMinor: 1800, discountMinor: 200, shippingMinor: 0 })
  expect(await provider.submit(quote.cartToken, input, quote.totals)).toBe('N-12')
  expect(calls.find((call) => call.url.pathname.endsWith('/cart/apply-coupon'))?.body).toEqual({ code: 'sale10' })
  expect(calls.at(-1)?.url.pathname).toBe('/wp-json/wc/v3/orders')
  expect(calls.at(-1)?.body).toMatchObject({
    status: 'pending', set_paid: false,
    billing: { first_name: 'Анна', last_name: 'Иванова', company: '', country: 'RU', city: 'Москва', state: 'Москва', postcode: '123456', address_1: 'Лесная, д. 3', address_2: 'кв. 5', email: 'anna@example.test', phone: '+79991234567' },
    shipping: { first_name: 'Анна', last_name: 'Иванова', company: '', country: 'RU', city: 'Москва', state: 'Москва', postcode: '123456', address_1: 'Лесная, д. 3', address_2: 'кв. 5' },
    line_items: [{ name: 'Station', quantity: 2, total: '18.00' }], customer_note: 'Позвонить', shipping_lines: [{ method_id: 'local_pickup', total: '0.00' }],
  })
  expect(calls.at(-1)?.headers.get('Authorization')).toBe(`Basic ${btoa('test:test')}`)
  expect(calls.at(-1)?.headers.get('Cart-Token')).toBeNull()
})

test('propagates Store API nonce and refreshed cart token during quote and revalidation', async () => {
  let cartReads = 0
  let storeResponses = 0
  const calls: { url: URL; headers: Headers; responseHeaders?: Headers }[] = []
  const provider = createWooCommerceOrders(config, (async (url: URL, init: RequestInit) => {
    const call: { url: URL; headers: Headers; responseHeaders?: Headers } = { url, headers: new Headers(init.headers) }
    calls.push(call)
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/orders')) return Response.json({ id: 12, number: 'N-12', status: 'pending' })
    const headers = { 'Cart-Token': `cart-${++storeResponses}`, Nonce: `nonce-${storeResponses}` }
    const response = Response.json(url.pathname.endsWith('/cart') && cartReads++ === 0 ? { items: [] } : cart, { headers })
    call.responseHeaders = new Headers(response.headers)
    return response
  }) as (url: URL, init?: RequestInit) => Promise<Response>)

  const quote = await provider.quote(input)
  await provider.submit(quote.cartToken, input, quote.totals)

  expect(calls.find((call) => call.url.pathname.endsWith('/cart/add-item'))?.headers.get('Nonce')).toBe('nonce-1')
  expect(calls.find((call) => call.url.pathname.endsWith('/cart/update-customer'))?.headers.get('Nonce')).toBe('nonce-2')
  expect(calls.find((call) => call.url.pathname.endsWith('/cart/update-customer'))?.headers.get('Cart-Token')).toBe('cart-2')
  const revalidation = calls.find((call) => call.url.pathname.endsWith('/cart') && call.headers.get('Cart-Token') === 'cart-5')
  expect(revalidation?.headers.get('Nonce')).toBeNull()
  expect(revalidation?.responseHeaders?.get('Cart-Token')).toBe('cart-6')
  expect(revalidation?.responseHeaders?.get('Nonce')).toBe('nonce-6')
  expect(calls.find((call) => call.url.pathname.endsWith('/orders'))?.headers.get('Authorization')).toBe(`Basic ${btoa('test:test')}`)
})

test('rejects paid-only shipping', async () => {
  let reads = 0
  const paidCart = { ...cart, shipping_rates: [{ package_id: 0, shipping_rates: [{ rate_id: 'flat_rate:1', method_id: 'flat_rate', price: '100000' }] }] }
  const provider = createWooCommerceOrders(config, (async (url: URL) => {
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    return Response.json(url.pathname.endsWith('/cart') && reads++ === 0 ? { items: [] } : paidCart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)
  await expect(provider.quote(input)).rejects.toThrow('Бесплатная доставка')
})

test('an ambiguous Admin REST order failure is not retryable', async () => {
  const provider = createWooCommerceOrders(config, (async (url: URL) => url.pathname.endsWith('/cart') ? Response.json(cart) : Response.json({ code: 'woocommerce_rest_payment_error' }, { status: 400 })) as (url: URL, init?: RequestInit) => Promise<Response>)
  try { await provider.submit('token', input, { currency: 'RUB', items: [{ sku: 'S1', name: 'Station', quantity: 2, totalMinor: 1800 }], totalMinor: 1800, discountMinor: 200, shippingMinor: 0 }); throw new Error('expected failure') }
  catch (error) { expect(error).toBeInstanceOf(OrderFailure); expect((error as OrderFailure).kind).toBe('unavailable') }
})

test('logs only safe WooCommerce HTTP failure details', async () => {
  const logs: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => logs.push(args)
  try {
    const provider = createWooCommerceOrders(config, async () => Response.json({ code: 'woocommerce_rest_checkout_error', message: 'contains private data' }, { status: 502 }))
    await expect(provider.quote(input)).rejects.toThrow('Оформление временно недоступно')
  } finally {
    console.error = originalError
  }
  expect(logs).toEqual([['WooCommerce HTTP failure', { path: '/wp-json/wc/store/v1/cart', status: 502, code: 'woocommerce_rest_checkout_error' }]])
})

test('logs only the error type for WooCommerce request timeout', async () => {
  const logs: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => logs.push(args)
  try {
    const provider = createWooCommerceOrders(config, async () => { throw new DOMException('private details', 'TimeoutError') })
    await expect(provider.quote(input)).rejects.toThrow('Магазин временно недоступен')
  } finally {
    console.error = originalError
  }
  expect(logs).toEqual([['WooCommerce request failure', { type: 'TimeoutError' }]])
})


test('WooCommerce coupon restrictions block the quote without accepting a client discount', async () => {
  const provider = createWooCommerceOrders(config, (async (url: URL) => {
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/cart/apply-coupon')) return Response.json({ code: 'woocommerce_rest_cart_coupon_error' }, { status: 400 })
    return Response.json(url.pathname.endsWith('/cart') ? { items: [] } : cart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)
  await expect(provider.quote(input)).rejects.toThrow('Промокод недействителен')
})

test('keeps the selected delivery method when delivery and pickup are both free', async () => {
  let reads = 0
  const calls: { url: URL; body: any }[] = []
  const ratesCart = { ...cart, shipping_rates: [{ package_id: 0, shipping_rates: [{ rate_id: 'cdek:1', method_id: 'cdek', price: '0' }, { rate_id: 'local_pickup:1', method_id: 'local_pickup', price: '0' }] }] }
  const deliveryInput = { ...input, customer: { ...input.customer, deliveryMethod: 'delivery' as const } }
  const provider = createWooCommerceOrders(config, (async (url: URL, init: RequestInit) => {
    calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : undefined })
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/orders')) return Response.json({ id: 12, number: 'N-12', status: 'pending' })
    return Response.json(url.pathname.endsWith('/cart') && reads++ === 0 ? { items: [] } : ratesCart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)

  const quote = await provider.quote(deliveryInput)
  expect(calls.find(({ url }) => url.pathname.endsWith('/cart/select-shipping-rate'))?.body).toEqual({ package_id: 0, rate_id: 'cdek:1' })
  await provider.submit(quote.cartToken, deliveryInput, quote.totals)
  expect(calls.at(-1)?.body.shipping_lines).toEqual([{ method_id: 'cdek', total: '0.00' }])
})
