import { cartReviewRequestSchema, cartReviewResponseSchema, type CartReviewRequest, type CartReviewResponse } from '@web-app-demo/contracts'
import { CatalogFailure, type CatalogListQuery, type CatalogProduct } from '../domain/catalog'
import type { CatalogClock, CatalogSource } from './ports'

export type CatalogListResult = {
  items: CatalogProduct[]
  page: number
  perPage: number
  total: number
  hasNext: boolean
  cachedAt: string
  stale: boolean
}

export type CatalogProductResult = {
  product: CatalogProduct
  cachedAt: string
  stale: boolean
}

type CacheEntry = {
  products: readonly CatalogProduct[]
  fetchedAt: Date
}

type CatalogServiceDependencies = {
  clock: CatalogClock
  source: CatalogSource
  cacheTtlMs: number
}

export class CatalogService {
  private cache: CacheEntry | undefined
  private refreshPromise: Promise<CacheEntry> | undefined

  constructor(private readonly dependencies: CatalogServiceDependencies) {}

  async list(query: CatalogListQuery): Promise<CatalogListResult> {
    const snapshot = await this.snapshot()
    const filtered = sortProducts(filterProducts(snapshot.products, query), query.sort)
    const start = (query.page - 1) * query.perPage

    return {
      items: filtered.slice(start, start + query.perPage),
      page: query.page,
      perPage: query.perPage,
      total: filtered.length,
      hasNext: start + query.perPage < filtered.length,
      cachedAt: snapshot.fetchedAt.toISOString(),
      stale: snapshot.stale,
    }
  }

  async getBySlug(slug: string): Promise<CatalogProductResult> {
    const snapshot = await this.snapshot()
    const product = snapshot.products.find((item) => item.slug === slug)
    if (!product) throw new CatalogFailure('not_found', 'Product not found')

    return {
      product,
      cachedAt: snapshot.fetchedAt.toISOString(),
      stale: snapshot.stale,
    }
  }

  async reviewCart(input: CartReviewRequest): Promise<CartReviewResponse> {
    const cart = cartReviewRequestSchema.parse(input)
    // Never use the browsing cache or its stale fallback to review a cart.
    const snapshot = await this.refresh()
    const items = cart.items.map((item) => {
      const product = snapshot.products.find(({ slug }) => slug === item.slug)
      const variant = product?.variants.find(({ sku }) => sku === item.sku)
      const unitPriceMinor = variant ? Math.round(variant.price * 100) : null
      return {
        ...item,
        status: variant?.availability ?? 'missing' as const,
        unitPriceMinor,
        lineTotalMinor: unitPriceMinor !== null && variant?.availability !== 'unavailable'
          ? unitPriceMinor * item.quantity : null,
      }
    })
    const result = cartReviewResponseSchema.safeParse({
      currency: 'RUB', checkedAt: snapshot.fetchedAt.toISOString(), items,
      subtotalMinor: items.reduce((sum, item) => sum + (item.lineTotalMinor ?? 0), 0),
    })
    if (!result.success) throw new CatalogFailure('invalid_response', 'Invalid cart prices')
    return result.data
  }

  private async snapshot(): Promise<CacheEntry & { stale: boolean }> {
    const current = this.cache
    const age = current
      ? this.dependencies.clock.now().getTime() - current.fetchedAt.getTime()
      : Number.POSITIVE_INFINITY

    if (current && age >= 0 && age < this.dependencies.cacheTtlMs) {
      return { ...current, stale: false }
    }

    try {
      return { ...(await this.refresh()), stale: false }
    } catch (error) {
      if (current) return { ...current, stale: true }
      throw error
    }
  }

  private refresh(): Promise<CacheEntry> {
    if (this.refreshPromise) return this.refreshPromise

    const promise = Promise.resolve()
      .then(() => this.dependencies.source.listProducts())
      .then((products) => {
        if (!Array.isArray(products)) {
          throw new CatalogFailure('invalid_response', 'Catalog source returned invalid data')
        }

        const next: CacheEntry = {
          products: [...products],
          fetchedAt: this.dependencies.clock.now(),
        }
        this.cache = next
        return next
      })
      .finally(() => {
        this.refreshPromise = undefined
      })

    this.refreshPromise = promise
    return promise
  }
}

function filterProducts(products: readonly CatalogProduct[], query: CatalogListQuery) {
  const needle = query.q?.trim().toLowerCase()

  return products.filter((product) => {
    if (query.category && product.category !== query.category) return false

    const prices = product.variants.map((variant) => variant.price)
    if (
      (query.minPrice !== undefined || query.maxPrice !== undefined) &&
      !prices.some(
        (price) =>
          (query.minPrice === undefined || price >= query.minPrice) &&
          (query.maxPrice === undefined || price <= query.maxPrice),
      )
    ) {
      return false
    }

    if (!needle) return true

    const searchable = [
      product.name,
      product.slug,
      product.category,
      ...product.variants.flatMap((variant) => [variant.sku, variant.label]),
      ...Object.entries(product.characteristics).flat(),
    ]

    return searchable.some((value) => value.toLowerCase().includes(needle))
  })
}

function sortProducts(products: CatalogProduct[], sort: CatalogListQuery['sort']) {
  return products.sort((left, right) => {
    const comparison = (() => {
      if (sort === 'newest') return dateValue(right.createdAt) - dateValue(left.createdAt)
      if (sort === 'price_asc') return startingPrice(left) - startingPrice(right)
      if (sort === 'price_desc') return startingPrice(right) - startingPrice(left)
      return right.popularity - left.popularity
    })()

    return comparison || left.name.localeCompare(right.name, 'ru')
  })
}

function startingPrice(product: CatalogProduct) {
  return Math.min(...product.variants.map((variant) => variant.price))
}

function dateValue(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}
