export type CatalogAvailability = 'in-stock' | 'preorder' | 'unavailable'

export type CatalogProductVariant = {
  sku: string
  label: string
  price: number
  oldPrice?: number
  availability: CatalogAvailability
}

export type CatalogProduct = {
  slug: string
  name: string
  category: string
  images: string[]
  shortDescription: string
  description: string
  characteristics: Record<string, string>
  packageContents: string[]
  warrantyMonths: number
  reviews: Array<{
    author: string
    rating: number
    text: string
  }>
  relatedProductSlugs: string[]
  promotionPeriod?: string
  popularity: number
  createdAt: string
  variants: CatalogProductVariant[]
}

export type CatalogSort = 'popularity' | 'price_asc' | 'price_desc' | 'newest'

export type CatalogListQuery = {
  q?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort: CatalogSort
  page: number
  perPage: number
}

export type CatalogFailureKind = 'not_configured' | 'unavailable' | 'invalid_response' | 'not_found'

export class CatalogFailure extends Error {
  constructor(
    readonly kind: CatalogFailureKind,
    message: string,
  ) {
    super(message)
    this.name = 'CatalogFailure'
  }
}
