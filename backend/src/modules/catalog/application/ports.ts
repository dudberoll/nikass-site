import type { CatalogProduct } from '../domain/catalog'

export type CatalogSource = {
  listProducts: () => Promise<readonly CatalogProduct[]>
}

export type CatalogClock = {
  now: () => Date
}
