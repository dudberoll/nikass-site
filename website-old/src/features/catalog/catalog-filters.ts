import { getStartingPrice, type CategorySlug, type Product } from './catalog-data'

export type CatalogCategory = CategorySlug | 'all'
export type CatalogSort = 'popularity' | 'price-asc' | 'price-desc' | 'newest'
export const CATALOG_PAGE_SIZE = 6

export type CatalogFilters = {
  query: string
  category: CatalogCategory
  minPrice?: number
  maxPrice?: number
  characteristics: Record<string, string>
}

export type CharacteristicFilter = {
  key: string
  values: string[]
}

export type CatalogPage = {
  items: Product[]
  page: number
  pageCount: number
  hasNext: boolean
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function searchableText(product: Product): string {
  return normalize([
    product.name,
    ...product.variants.map((variant) => variant.sku),
    ...Object.entries(product.characteristics).flat(),
  ].join(' '))
}

export function filterProducts(products: Product[], filters: CatalogFilters): Product[] {
  const query = normalize(filters.query)

  return products.filter((product) => {
    if (filters.category !== 'all' && product.category !== filters.category) return false
    if (query && !searchableText(product).includes(query)) return false

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const startingPrice = getStartingPrice(product)
      const hasPriceInRange =
        (filters.minPrice === undefined || startingPrice >= filters.minPrice) &&
        (filters.maxPrice === undefined || startingPrice <= filters.maxPrice)

      if (!hasPriceInRange) return false
    }

    return Object.entries(filters.characteristics).every(([key, value]) =>
      !value || product.characteristics[key] === value,
    )
  })
}

export function sortProducts(products: Product[], sort: CatalogSort): Product[] {
  return [...products].sort((left, right) => {
    const result = sort === 'popularity'
      ? right.popularity - left.popularity
      : sort === 'price-asc'
        ? getStartingPrice(left) - getStartingPrice(right)
        : sort === 'price-desc'
          ? getStartingPrice(right) - getStartingPrice(left)
          : right.createdAt.localeCompare(left.createdAt)

    return result || left.slug.localeCompare(right.slug)
  })
}

export function filterAndSortProducts(
  products: Product[],
  filters: CatalogFilters,
  sort: CatalogSort,
): Product[] {
  return sortProducts(filterProducts(products, filters), sort)
}

export function paginateProducts(
  products: Product[],
  page: number,
  pageSize = CATALOG_PAGE_SIZE,
): CatalogPage {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : CATALOG_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(products.length / safePageSize))
  const safePage = Number.isInteger(page) && page > 0 ? Math.min(page, pageCount) : 1
  const start = (safePage - 1) * safePageSize

  return {
    items: products.slice(start, start + safePageSize),
    page: safePage,
    pageCount,
    hasNext: start + safePageSize < products.length,
  }
}

export function getCharacteristicFilters(
  products: Product[],
  category: CatalogCategory,
): CharacteristicFilter[] {
  if (category === 'all') return []

  const categoryProducts = products.filter((product) => product.category === category)
  const keys = [...new Set(categoryProducts.flatMap((product) => Object.keys(product.characteristics)))]

  return keys
    .map((key) => ({
      key,
      values: [...new Set(categoryProducts
        .map((product) => product.characteristics[key])
        .filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right, 'ru-RU')),
    }))
    .filter(({ values }) => values.length > 0)
}

export function getPriceBounds(products: Product[]): { min: number; max: number } {
  const prices = products.map(getStartingPrice)

  if (prices.length === 0) return { min: 0, max: 0 }

  return { min: Math.min(...prices), max: Math.max(...prices) }
}
