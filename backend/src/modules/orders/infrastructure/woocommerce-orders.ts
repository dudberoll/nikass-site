import { z } from 'zod'
import { cdekParcelsResponseSchema, type CartReviewRequest, type OrderQuoteRequest, type OrderTotals } from '@web-app-demo/contracts'
import { OrderFailure, type OrderProvider, type PaidOrderProvider } from '../application/ports'

const minor = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
const stockStatus = z.enum(['instock', 'onbackorder', 'outofstock'])
const measure = z.union([z.string(), z.number()]).nullish()
const dimensionsSchema = z.object({ length: measure, width: measure, height: measure }).passthrough().nullish()
const cartSchema = z.object({
  items: z.array(z.object({ id: z.number().int().positive(), sku: z.string().min(1), name: z.string().min(1), quantity: z.number().int().positive(), totals: z.object({ line_total: minor, line_total_tax: minor }) })),
  totals: z.object({ currency_code: z.literal('RUB'), currency_minor_unit: z.literal(2), total_price: minor, total_discount: minor, total_discount_tax: minor, total_shipping: minor, total_shipping_tax: minor }),
  shipping_rates: z.array(z.object({ package_id: z.number().int(), shipping_rates: z.array(z.object({ rate_id: z.string(), price: minor, method_id: z.string() })) })).default([]),
  errors: z.array(z.unknown()).default([]),
})
const productsSchema = z.array(z.object({ id: z.number().int().positive(), slug: z.string(), sku: z.string(), type: z.string().optional(), stock_status: stockStatus, weight: measure, dimensions: dimensionsSchema }))
const variationsSchema = z.array(z.object({ id: z.number().int().positive(), sku: z.string(), stock_status: stockStatus, weight: measure, dimensions: dimensionsSchema }))
const shippingSettingsSchema = z.array(z.object({ id: z.string(), value: z.unknown() }).passthrough())
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
const positiveMeasure = (value: unknown) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) && number > 0 ? number : null
}
const dimensions = (...values: Array<z.infer<typeof dimensionsSchema>>) => {
  for (const value of values) {
    if (!value) continue
    const length = positiveMeasure(value.length)
    const width = positiveMeasure(value.width)
    const height = positiveMeasure(value.height)
    if (length && width && height) return { length, width, height }
  }
  return null
}

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
  const productReferenceInStock = async (item: OrderQuoteRequest['cart']['items'][number]) => {
    const url = new URL(config.productsEndpoint)
    url.searchParams.set('slug', item.slug)
    url.searchParams.set('status', 'publish')
    const products = productsSchema.parse((await request(url, undefined, undefined, true)).data)
    const product = products.find((value) => value.slug === item.slug)
    if (!product) throw new OrderFailure('invalid', 'Товар больше не в наличии. Удалите его из корзины и оставьте заявку о поступлении.')

    let status = product.stock_status
    let variationId: number | undefined
    let weight = positiveMeasure(product.weight)
    let packageDimensions = dimensions(product.dimensions)
    if (product.type === 'variable') {
      const variantsUrl = new URL(config.productsEndpoint.replace(/\/$/, '') + `/${product.id}/variations`)
      variantsUrl.searchParams.set('sku', item.sku)
      const variants = variationsSchema.parse((await request(variantsUrl, undefined, undefined, true)).data)
      const variant = variants.find((value) => value.sku === item.sku)
      if (!variant) throw new OrderFailure('invalid', 'Вариант товара больше не в наличии. Оставьте заявку о поступлении.')
      status = variant.stock_status
      variationId = variant.id
      weight = positiveMeasure(variant.weight) ?? weight
      packageDimensions = dimensions(variant.dimensions) ?? packageDimensions
    } else if (product.sku !== item.sku) {
      throw new OrderFailure('invalid', 'Артикул товара изменился. Обновите корзину.')
    }

    if (status !== 'instock') throw new OrderFailure('invalid', 'Товара сейчас нет в наличии. Удалите его из корзины и оставьте заявку о поступлении.')
    return { productId: product.id, variationId, weight, dimensions: packageDimensions }
  }
  const productIdInStock = async (item: OrderQuoteRequest['cart']['items'][number]) => {
    const product = await productReferenceInStock(item)
    return product.variationId ?? product.productId
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
    const lineItems = await Promise.all(totals.items.map(async (line) => {
      const item = input.cart.items.find(({ sku }) => sku === line.sku)
      if (!item) throw new OrderFailure('invalid', 'Состав заказа изменился. Проверьте заказ заново.')
      const product = await productReferenceInStock(item)
      return {
        product_id: product.productId,
        ...(product.variationId ? { variation_id: product.variationId } : {}),
        name: line.name,
        quantity: line.quantity,
        total: (line.totalMinor / 100).toFixed(2),
      }
    }))
    const cdekPoint = input.customer.cdekPoint
    const deliveryNote = cdekPoint
      ? `СДЭК, ПВЗ ${cdekPoint.code}: ${cdekPoint.name}, ${cdekPoint.city}, ${cdekPoint.address}${cdekPoint.shippingMinor === null ? '. Стоимость подтвердит менеджер.' : `. Ориентир доставки ${(cdekPoint.shippingMinor / 100).toFixed(2)} ₽, оплачивается отдельно.`}`
      : ''
    const response = await request(adminUrl('orders'), {
      status: paid ? 'processing' : 'pending', set_paid: paid, billing, shipping,
      ...(paid ? { payment_method: 'yookassa', payment_method_title: 'ЮKassa', transaction_id: paidPaymentId, meta_data: [{ key: 'nikass_payment_id', value: paidPaymentId }] } : {}),
      line_items: lineItems,
      customer_note: [input.customer.comment, deliveryNote].filter(Boolean).join('\n\n'),
      ...(selectedRates.length ? { shipping_lines: selectedRates } : {}),
    }, undefined, true)
    const order = orderSchema.safeParse(response.data)
    if (!order.success || (paid && !['processing', 'completed'].includes(order.data.status))) throw new OrderFailure('unavailable', 'Результат оформления требует проверки менеджером.')
    return order.data.number ?? String(order.data.id)
  }
  return {
    assertInStock: async (input) => {
      for (const item of input.cart.items) await productIdInStock(item)
    },
    shippingParcels: async (cart: CartReviewRequest) => {
      const settingsUrl = adminUrl('settings/products')
      const settings = shippingSettingsSchema.parse((await request(settingsUrl, undefined, undefined, true)).data)
      const weightUnit = settings.find(({ id }) => id === 'woocommerce_weight_unit')?.value
      const dimensionUnit = settings.find(({ id }) => id === 'woocommerce_dimension_unit')?.value
      const grams = ({ kg: 1000, g: 1, lbs: 453.59237, oz: 28.349523125 } as Record<string, number>)[String(weightUnit)]
      const centimeters = ({ mm: 0.1, cm: 1, m: 100, in: 2.54, yd: 91.44 } as Record<string, number>)[String(dimensionUnit)]
      if (!grams || !centimeters) throw new OrderFailure('unavailable', 'Не удалось определить единицы веса и размера для расчёта СДЭК.')

      const parcels: Array<{ length: number; width: number; height: number; weight: number }> = []
      let missingItems = 0
      for (const item of cart.items) {
        const product = await productReferenceInStock(item)
        const size = product.dimensions
        const weight = product.weight && Math.ceil(product.weight * grams)
        if (!size || !weight) {
          missingItems += 1
          continue
        }
        for (let count = 0; count < item.quantity; count += 1) {
          parcels.push({ length: Math.ceil(size.length * centimeters), width: Math.ceil(size.width * centimeters), height: Math.ceil(size.height * centimeters), weight })
        }
      }
      const canCalculate = missingItems === 0 && parcels.length > 0 && parcels.length <= 100
      return cdekParcelsResponseSchema.parse({ canCalculate, parcels: canCalculate ? parcels : [], missingItems })
    },
    quote: async (input) => {
      const session: StoreSession = {}
      const first = await request(storeUrl('cart'), undefined, session)
      if (!session.cartToken) throw new OrderFailure('unavailable', 'Магазин не создал корзину.')
      if (z.object({ items: z.array(z.unknown()) }).parse(first.data).items.length) throw new OrderFailure('unavailable', 'Магазин вернул непустую новую корзину.')
      for (const item of input.cart.items) {
        const id = await productIdInStock(item)
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
