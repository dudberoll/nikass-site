import { z } from 'zod'

import type { CatalogSource } from '../application/ports'
import {
  CatalogFailure,
  type CatalogAvailability,
  type CatalogProduct,
  type CatalogProductVariant,
} from '../domain/catalog'

export type CatalogFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type WooCommerceCatalogConfig = {
  productsEndpoint: string
  consumerKey: string
  consumerSecret: string
  requestTimeoutMs: number
}

const moneyValueSchema = z.union([z.string(), z.number()]).nullish()

const wooVariationSchema = z
  .object({
    id: z.union([z.number().int(), z.string().min(1)]).nullish(),
    sku: z.string().nullish(),
    price: moneyValueSchema,
    regular_price: moneyValueSchema,
    sale_price: moneyValueSchema,
    stock_status: z.string().nullish(),
    attributes: z
      .array(
        z
          .object({
            name: z.string().nullish(),
            option: z.string().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
  })
  .passthrough()

const wooProductSchema = z
  .object({
    id: z.union([z.number().int(), z.string().min(1)]),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    sku: z.string().nullish(),
    price: moneyValueSchema,
    regular_price: moneyValueSchema,
    sale_price: moneyValueSchema,
    stock_status: z.string().nullish(),
    short_description: z.string().nullish(),
    description: z.string().nullish(),
    date_created: z.string().nullish(),
    date_on_sale_from: z.string().nullish(),
    date_on_sale_to: z.string().nullish(),
    type: z.string().nullish(),
    total_sales: moneyValueSchema,
    featured: z.boolean().nullish(),
    categories: z
      .array(
        z
          .object({
            slug: z.string().nullish(),
            name: z.string().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
    images: z
      .array(
        z
          .object({
            src: z.string().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
    attributes: z
      .array(
        z
          .object({
            name: z.string().nullish(),
            options: z.array(z.string()).nullish(),
          })
          .passthrough(),
      )
      .nullish(),
    variations: z.array(z.unknown()).nullish(),
  })
  .passthrough()

type WooProduct = z.infer<typeof wooProductSchema>
type WooVariation = z.infer<typeof wooVariationSchema>

export function createWooCommerceCatalogSource(
  config: WooCommerceCatalogConfig,
  fetchImpl: CatalogFetch = fetch,
): CatalogSource {
  return {
    listProducts: async () => {
      const rawProducts = await requestJson(
        withListParams(config.productsEndpoint),
        config,
        fetchImpl,
      )
      const products = parseProducts(rawProducts)
      const normalized: CatalogProduct[] = []

      for (const product of products) {
        const variations = await loadVariations(product, config, fetchImpl)
        normalized.push(mapProduct(product, variations))
      }

      return normalized
    },
  }
}

async function loadVariations(
  product: WooProduct,
  config: WooCommerceCatalogConfig,
  fetchImpl: CatalogFetch,
): Promise<WooVariation[]> {
  const embedded = (product.variations ?? [])
    .filter((value): value is Record<string, unknown> => isRecord(value))
    .map((value) => wooVariationSchema.safeParse(value))

  if (embedded.length > 0) {
    if (embedded.some((result) => !result.success)) {
      throw new CatalogFailure('invalid_response', 'Catalog provider returned invalid variants')
    }
    return embedded.flatMap((result) => (result.success ? [result.data] : []))
  }

  if (product.type !== 'variable') return []

  // ponytail: one variation request per variable product; batch only if the catalog grows enough
  // for this measured N+1 path to become a bottleneck.
  const variationsEndpoint = new URL(config.productsEndpoint)
  variationsEndpoint.search = ''
  variationsEndpoint.hash = ''
  variationsEndpoint.pathname = `${variationsEndpoint.pathname.replace(/\/+$/, '')}/${encodeURIComponent(String(product.id))}/variations`

  const rawVariations = await requestJson(
    withListParams(variationsEndpoint.toString()),
    config,
    fetchImpl,
  )
  return parseVariations(rawVariations)
}

function parseProducts(value: unknown): WooProduct[] {
  const result = z.array(wooProductSchema).safeParse(value)
  if (!result.success) {
    throw new CatalogFailure('invalid_response', 'Catalog provider returned invalid products')
  }
  return result.data
}

function parseVariations(value: unknown): WooVariation[] {
  const result = z.array(wooVariationSchema).safeParse(value)
  if (!result.success) {
    throw new CatalogFailure('invalid_response', 'Catalog provider returned invalid variants')
  }
  return result.data
}

async function requestJson(
  url: string,
  config: WooCommerceCatalogConfig,
  fetchImpl: CatalogFetch,
): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${btoa(`${config.consumerKey}:${config.consumerSecret}`)}`,
        },
        signal: controller.signal,
      })
    } catch {
      throw new CatalogFailure('unavailable', 'Catalog provider is unavailable')
    }

    if (!response.ok) {
      throw new CatalogFailure('unavailable', 'Catalog provider returned an error')
    }

    try {
      return await response.json()
    } catch {
      throw new CatalogFailure('invalid_response', 'Catalog provider returned invalid JSON')
    }
  } finally {
    clearTimeout(timeout)
  }
}

function withListParams(endpoint: string) {
  const url = new URL(endpoint)
  // ponytail: per_page=100 covers the first-version ceiling of 50 products; follow the
  // X-WP-TotalPages header when the catalog grows beyond that limit.
  url.searchParams.set('per_page', '100')
  url.searchParams.set('status', 'publish')
  return url.toString()
}

function mapProduct(product: WooProduct, variations: WooVariation[]): CatalogProduct {
  const variants = variations.length > 0
    ? variations.map((variation) => mapVariant(variation, 'Вариант'))
    : [mapVariant({ ...product, attributes: undefined }, 'Основной вариант')]

  return {
    slug: product.slug,
    name: product.name,
    category: product.categories?.find((category) => category.slug)?.slug ?? 'uncategorized',
    images: (product.images ?? [])
      .map((image) => httpUrl(image.src))
      .filter((value): value is string => value !== undefined),
    shortDescription: product.short_description?.trim() ?? '',
    description: product.description?.trim() ?? '',
    characteristics: attributesToRecord(product.attributes),
    packageContents: [],
    warrantyMonths: 12,
    reviews: [],
    relatedProductSlugs: [],
    promotionPeriod: promotionPeriod(product),
    popularity: parseNumber(product.total_sales) ?? (product.featured ? 1 : 0),
    createdAt: isoDate(product.date_created),
    variants,
  }
}

function mapVariant(
  product: Pick<WooProduct, 'sku' | 'price' | 'regular_price' | 'sale_price' | 'stock_status'> & {
    attributes?: WooVariation['attributes']
  },
  fallbackLabel: string,
): CatalogProductVariant {
  const sku = product.sku?.trim()
  const price = parseNumber(product.sale_price) ?? parseNumber(product.price) ?? parseNumber(product.regular_price)
  if (!sku || price === null) {
    throw new CatalogFailure('invalid_response', 'Catalog product has no usable SKU or price')
  }

  const oldPrice = parseNumber(product.regular_price)
  return {
    sku,
    label: attributesLabel(product.attributes) || fallbackLabel,
    price,
    ...(oldPrice !== null && oldPrice > price ? { oldPrice } : {}),
    availability: availability(product.stock_status),
  }
}

function attributesToRecord(attributes: WooProduct['attributes']): Record<string, string> {
  return Object.fromEntries(
    (attributes ?? [])
      .map((attribute) => {
        const name = attribute.name?.trim()
        const options = attribute.options?.map((option) => option.trim()).filter(Boolean)
        return name && options?.length ? [name, options.join(', ')] : null
      })
      .filter((entry): entry is [string, string] => entry !== null),
  )
}

function attributesLabel(attributes: WooVariation['attributes']) {
  return (attributes ?? [])
    .map((attribute) => {
      const name = attribute.name?.trim()
      const option = attribute.option?.trim()
      return name && option ? `${name}: ${option}` : option ?? name
    })
    .filter((value): value is string => Boolean(value))
    .join(' / ')
}

function availability(status: string | null | undefined): CatalogAvailability {
  if (status === 'instock') return 'in-stock'
  if (status === 'onbackorder') return 'preorder'
  return 'unavailable'
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null

  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function promotionPeriod(product: WooProduct) {
  const from = product.date_on_sale_from?.trim()
  const to = product.date_on_sale_to?.trim()
  if (!from && !to) return undefined
  return [from, to].filter(Boolean).join(' — ')
}

function isoDate(value: string | null | undefined) {
  if (!value) return new Date(0).toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function httpUrl(value: string | null | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
