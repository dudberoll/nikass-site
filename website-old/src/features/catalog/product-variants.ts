import type { Product, ProductVariant } from './catalog-data'

export function getSelectedVariant(product: Product, sku?: string): ProductVariant | undefined {
  return product.variants.find((variant) => variant.sku === sku) ?? product.variants[0]
}

export function isVariantAddable(variant: ProductVariant): boolean {
  return variant.availability !== 'unavailable'
}
