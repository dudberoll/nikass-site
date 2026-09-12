import { expect, test } from 'bun:test'
import { createWooCommerceOrders } from './woocommerce-orders'
import { OrderFailure } from '../application/ports'
import type { OrderQuoteRequest } from '@web-app-demo/contracts'

const input: OrderQuoteRequest = { cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 2 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '5', postcode: '123456', comment: 'Позвонить', consent: true }, promoCode: 'sale10' }
const config = { productsEndpoint: 'https://shop.example.test/wp-json/wc/v3/products', storeEndpoint: 'https://shop.example.test/wp-json/wc/store/v1', consumerKey: 'test', consumerSecret: 'test', timeoutMs: 1000 }
const cart = { items: [{ id: 1, sku: 'S1', name: 'Station', quantity: 2, totals: { line_total: '1800', line_total_tax: '0' } }], totals: { currency_code: 'RUB', currency_minor_unit: 2, total_price: '1800', total_discount: '200', total_discount_tax: '0', total_shipping: '0', total_shipping_tax: '0' }, shipping_rates: [{ package_id: 0, shipping_rates: [{ rate_id: 'free_shipping:1', method_id: 'free_shipping', price: '0' }] }], errors: [] }

test('uses native WooCommerce coupon/stock validation, free shipping and confirmed total', async () => {
  let reads = 0
  const calls: { url: URL; body: any; headers: Headers }[] = []
  const provider = createWooCommerceOrders(config, (async (url: URL, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body, headers: new Headers(init.headers) })
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/checkout')) return Response.json({ order_id: 12, order_number: 'N-12', status: 'on-hold' })
    return Response.json(url.pathname.endsWith('/cart') && reads++ === 0 ? { items: [] } : cart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)
  const quote = await provider.quote(input)
  expect(quote.totals).toMatchObject({ totalMinor: 1800, discountMinor: 200, shippingMinor: 0 })
  expect(await provider.submit(quote.cartToken, input, quote.totals)).toBe('N-12')
  expect(calls.find((call) => call.url.pathname.endsWith('/cart/apply-coupon'))?.body).toEqual({ code: 'sale10' })
  expect(calls.at(-1)?.body).toMatchObject({ expected_total: '1800', payment_method: 'cheque', create_account: false, billing_address: { country: 'RU', phone: '+79991234567' }, shipping_address: { address_1: 'Лесная, д. 3', address_2: 'кв. 5' } })
  expect(calls.at(-1)?.headers.get('Authorization')).toBeNull()
  expect(calls.at(-1)?.headers.get('Cart-Token')).toBe('private-cart')
})

test('an ambiguous checkout failure is not retryable', async () => {
  const provider = createWooCommerceOrders(config, (async (url: URL) => url.pathname.endsWith('/cart') ? Response.json(cart) : Response.json({ code: 'woocommerce_rest_payment_error' }, { status: 400 })) as (url: URL, init?: RequestInit) => Promise<Response>)
  try { await provider.submit('token', input, { currency: 'RUB', items: [{ sku: 'S1', name: 'Station', quantity: 2, totalMinor: 1800 }], totalMinor: 1800, discountMinor: 200, shippingMinor: 0 }); throw new Error('expected failure') }
  catch (error) { expect(error).toBeInstanceOf(OrderFailure); expect((error as OrderFailure).kind).toBe('unavailable') }
})


test('WooCommerce coupon restrictions block the quote without accepting a client discount', async () => {
  const provider = createWooCommerceOrders(config, (async (url: URL) => {
    if (url.pathname.endsWith('/products')) return Response.json([{ id: 1, slug: 'station', sku: 'S1', type: 'simple' }])
    if (url.pathname.endsWith('/cart/apply-coupon')) return Response.json({ code: 'woocommerce_rest_cart_coupon_error' }, { status: 400 })
    return Response.json(url.pathname.endsWith('/cart') ? { items: [] } : cart, { headers: { 'Cart-Token': 'private-cart' } })
  }) as (url: URL, init?: RequestInit) => Promise<Response>)
  await expect(provider.quote(input)).rejects.toThrow('Промокод недействителен')
})
