import { z } from 'zod'
import type { OrderQuoteRequest, OrderTotals } from '@web-app-demo/contracts'
import { OrderFailure, type OrderProvider, type PaidOrderProvider } from '../application/ports'

const minor = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
const cartSchema = z.object({
  items: z.array(z.object({ id: z.number().int().positive(), sku: z.string().min(1), name: z.string().min(1), quantity: z.number().int().positive(), totals: z.object({ line_total: minor, line_total_tax: minor }) })),
  totals: z.object({ currency_code: z.literal('RUB'), currency_minor_unit: z.literal(2), total_price: minor, total_discount: minor, total_discount_tax: minor, total_shipping: minor, total_shipping_tax: minor }),
  shipping_rates: z.array(z.object({ package_id: z.number().int(), shipping_rates: z.array(z.object({ rate_id: z.string(), price: minor, method_id: z.string() })) })).default([]),
  errors: z.array(z.unknown()).default([]),
})
const productsSchema = z.array(z.object({ id: z.number().int().positive(), slug: z.string(), sku: z.string(), type: z.string().optional() }))
const orderSchema = z.object({ id: z.number().int().positive(), number: z.string().optional(), status: z.enum(['pending', 'on-hold', 'processing', 'completed']) })

type Config = { productsEndpoint: string; storeEndpoint: string; consumerKey: string; consumerSecret: string; timeoutMs: number }
type StoreSession = { cartToken?: string; nonce?: string }
type ShippingRate = { rate_id: string; price: number; method_id: string }
const preferredFreeRate = (rates: ShippingRate[], method: OrderQuoteRequest['customer']['deliveryMethod'] = 'delivery') => {
  const free = rates.filter((rate) => rate.price === 0)
  return method === 'pickup'
    ? free.find((rate) => rate.method_id === 'local_pickup')
    : free.find((rate) => rate.method_id !== 'local_pickup') ?? free[0]
}
const displayProductName = (name: string) => /станц/i.test(name) ? name.replace(/\bSL(?=\s*[-]?\d)/gi, 'NS') : name
export function createWooCommerceOrders(config: Config, fetchImpl: (url: URL, init?: RequestInit) => Promise<Response> = fetch): OrderProvider & PaidOrderProvider {
  const request = async (url: URL, body?: unknown, session?: StoreSession, admin = false) => {
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(session?.cartToken ? { 'Cart-Token': session.cartToken } : {}), ...(session?.nonce ? { Nonce: session.nonce } : {}), ...(admin ? { Authorization: `Basic ${btoa(`${config.consumerKey}:${config.consumerSecret}`)}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(config.timeoutMs),
      })
    } catch (error) {
      console.error('WooCommerce request failure', { type: error instanceof Error ? error.name : typeof error })
      throw new OrderFailure('unavailable', 'Магазин временно недоступен. Попробуйте позже.')
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { code?: string } | null
      console.error('WooCommerce HTTP failure', { path: url.pathname, status: response.status, code: data?.code ?? null })
      // Only explicit validation responses are known not to have completed an order.
      const validation = url.pathname.endsWith('/checkout')
        ? data?.code === 'woocommerce_rest_checkout_total_mismatch'
        : url.pathname.endsWith('/orders')
          ? data?.code === 'woocommerce_rest_invalid_param'
          : response.status === 400 || response.status === 409
      const coupon = data?.code?.includes('coupon')
      throw new OrderFailure(validation ? 'invalid' : 'unavailable', coupon
        ? 'Промокод недействителен или не подходит к этому заказу.'
        : validation ? 'Цена, остаток или данные доставки изменились. Проверьте заказ заново.' : 'Оформление временно недоступно.')
    }
    const cartToken = response.headers.get('Cart-Token')
    const nonce = response.headers.get('Nonce')
    if (session) {
      if (cartToken) session.cartToken = cartToken
      if (nonce) session.nonce = nonce
    }
    return { data: await response.json() }
  }
  const storeUrl = (path: string) => new URL(`${config.storeEndpoint.replace(/\/$/, '')}/${path}`)
  const adminUrl = (path: string) => new URL(`${config.productsEndpoint.replace(/\/products\/?$/, '')}/${path}`)
  const parseCart = (data: unknown) => {
    const parsed = cartSchema.safeParse(data)
    if (!parsed.success) throw new OrderFailure('unavailable', 'Магазин вернул некорректный расчёт.')
    if (parsed.data.errors.length) throw new OrderFailure('invalid', 'Проверьте наличие товаров и промокод.')
    return parsed.data
  }
  const submitOrder = async (cartToken: string, input: OrderQuoteRequest, totals: OrderTotals, paidPaymentId?: string) => {
    const session: StoreSession = { cartToken }
    const fresh = parseCart((await request(storeUrl('cart'), undefined, session)).data)
    if (fresh.totals.total_price !== totals.totalMinor || fresh.items.length !== totals.items.length || fresh.items.some((item) => !totals.items.some((line) => line.sku === item.sku && line.quantity === item.quantity && line.totalMinor === item.totals.line_total + item.totals.line_total_tax))) {
      throw new OrderFailure('invalid', 'Цена или состав заказа изменились. Проверьте заказ заново.')
    }
    const { billing_address: billing, shipping_address: shipping } = addresses(input)
    const paid = Boolean(paidPaymentId)
    const selectedRates = fresh.shipping_rates.flatMap(({ shipping_rates }) => {
      const rate = preferredFreeRate(shipping_rates, input.customer.deliveryMethod)
      return rate ? [{ method_id: rate.method_id, total: '0.00' }] : []
    })
    const response = await request(adminUrl('orders'), {
      status: paid ? 'processing' : 'pending', set_paid: paid, billing, shipping,
      ...(paid ? { payment_method: 'yookassa', payment_method_title: 'ЮKassa', transaction_id: paidPaymentId, meta_data: [{ key: 'nikass_payment_id', value: paidPaymentId }] } : {}),
      line_items: totals.items.map(({ name, quantity, totalMinor }) => ({ name, quantity, total: (totalMinor / 100).toFixed(2) })),
      customer_note: input.customer.comment,
      ...(selectedRates.length ? { shipping_lines: selectedRates } : {}),
    }, undefined, true)
    const order = orderSchema.safeParse(response.data)
    if (!order.success) throw new OrderFailure('unavailable', 'Результат оформления требует проверки менеджером.')
    return order.data.number ?? String(order.data.id)
  }
  return {
    quote: async (input) => {
      const session: StoreSession = {}
      const first = await request(storeUrl('cart'), undefined, session)
      if (!session.cartToken) throw new OrderFailure('unavailable', 'Магазин не создал корзину.')
      if (z.object({ items: z.array(z.unknown()) }).parse(first.data).items.length) throw new OrderFailure('unavailable', 'Магазин вернул непустую новую корзину.')
      for (const item of input.cart.items) {
        const url = new URL(config.productsEndpoint)
        url.searchParams.set('slug', item.slug)
        url.searchParams.set('status', 'publish')
        const products = productsSchema.parse((await request(url, undefined, undefined, true)).data)
        const product = products.find((value) => value.slug === item.slug)
        if (!product) throw new OrderFailure('invalid', 'Товар больше недоступен.')
        let id = product.id
        if (product.type === 'variable') {
          const variantsUrl = new URL(config.productsEndpoint.replace(/\/$/, '') + `/${id}/variations`)
          variantsUrl.searchParams.set('sku', item.sku)
          const variants = z.array(z.object({ id: z.number().int().positive(), sku: z.string() })).parse((await request(variantsUrl, undefined, undefined, true)).data)
          const variant = variants.find((value) => value.sku === item.sku)
          if (!variant) throw new OrderFailure('invalid', 'Вариант товара больше недоступен.')
          id = variant.id
        } else if (product.sku !== item.sku) throw new OrderFailure('invalid', 'Артикул товара изменился.')
        await request(storeUrl('cart/add-item'), { id, quantity: item.quantity }, session)
      }
      let cart = parseCart((await request(storeUrl('cart/update-customer'), addresses(input), session)).data)
      for (const delivery of cart.shipping_rates) {
        const free = preferredFreeRate(delivery.shipping_rates, input.customer.deliveryMethod)
        if (!free) throw new OrderFailure('unavailable', 'Бесплатная доставка в магазинe не настроена.')
        cart = parseCart((await request(storeUrl('cart/select-shipping-rate'), { package_id: delivery.package_id, rate_id: free.rate_id }, session)).data)
      }
      if (input.promoCode) cart = parseCart((await request(storeUrl('cart/apply-coupon'), { code: input.promoCode }, session)).data)
      if (cart.totals.total_shipping !== 0 || cart.totals.total_shipping_tax !== 0) throw new OrderFailure('unavailable', 'Бесплатная доставка не настроена.')
      if (cart.items.length !== input.cart.items.length || input.cart.items.some((line) => !cart.items.some((item) => item.sku === line.sku && item.quantity === line.quantity))) throw new OrderFailure('invalid', 'Состав корзины изменился.')
      return { cartToken: session.cartToken!, totals: {
        currency: 'RUB', items: cart.items.map((item) => ({ sku: item.sku, name: displayProductName(item.name), quantity: item.quantity, totalMinor: item.totals.line_total + item.totals.line_total_tax })),
        discountMinor: cart.totals.total_discount + cart.totals.total_discount_tax,
        shippingMinor: 0, totalMinor: cart.totals.total_price,
      } }

    },
    submit: async (cartToken, input, totals: OrderTotals) => submitOrder(cartToken, input, totals),
    submitPaid: async (cartToken, input, totals: OrderTotals, paymentId: string) => submitOrder(cartToken, input, totals, paymentId),
  }
}

function addresses({ customer }: OrderQuoteRequest) {
  const [firstName, ...lastName] = customer.name.split(/\s+/)
  const address = { first_name: firstName, last_name: lastName.join(' '), company: '', country: 'RU', city: customer.city, state: customer.region, postcode: customer.postcode, address_1: `${customer.street}, д. ${customer.house}`, address_2: customer.apartment ? `кв. ${customer.apartment}` : '' }
  return { billing_address: { ...address, email: customer.email, phone: customer.phone }, shipping_address: address }
}
