import type { AppEnv } from '../../env'
import { CatalogService } from './application/catalog-service'
import type { CatalogClock, CatalogSource } from './application/ports'
import { CatalogFailure } from './domain/catalog'
import { createWooCommerceCatalogSource } from './infrastructure/woocommerce-source'
import { createCatalogRoutes } from './transport/routes'

type CreateCatalogModuleOptions = {
  env: AppEnv
  source?: CatalogSource
  clock?: CatalogClock
}

const systemClock: CatalogClock = {
  now: () => new Date(),
}

export function createCatalogModule({ env, source, clock = systemClock }: CreateCatalogModuleOptions) {
  const service = new CatalogService({
    cacheTtlMs: env.CATALOG_CACHE_TTL_SECONDS * 1000,
    clock,
    source: source ?? sourceFromEnv(env),
  })

  return {
    routes: createCatalogRoutes(service),
    service,
  }
}

function sourceFromEnv(env: AppEnv): CatalogSource {
  if (env.CATALOG_PROVIDER !== 'woocommerce') {
    return {
      listProducts: async () => {
        throw new CatalogFailure('not_configured', 'Catalog provider is not configured')
      },
    }
  }

  if (
    !env.WOOCOMMERCE_PRODUCTS_ENDPOINT ||
    !env.WOOCOMMERCE_CONSUMER_KEY ||
    !env.WOOCOMMERCE_CONSUMER_SECRET
  ) {
    return {
      listProducts: async () => {
        throw new CatalogFailure('not_configured', 'WooCommerce catalog credentials are incomplete')
      },
    }
  }

  return createWooCommerceCatalogSource({
    consumerKey: env.WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET,
    productsEndpoint: env.WOOCOMMERCE_PRODUCTS_ENDPOINT,
    requestTimeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS,
  })
}

export { CatalogService } from './application/catalog-service'
export { CatalogFailure } from './domain/catalog'
export type {
  CatalogAvailability,
  CatalogListQuery,
  CatalogProduct,
  CatalogProductVariant,
  CatalogSort,
} from './domain/catalog'
export type { CatalogClock, CatalogSource } from './application/ports'
