import type { AppEnv } from '../../env'
import type { DbClient } from '../../db'
import { RestockService } from './application/restock-service'
import { createRestockQueue } from './infrastructure/restock-notifications'
import { CatalogService } from './application/catalog-service'
import type { CatalogClock, CatalogSource } from './application/ports'
import { CatalogFailure } from './domain/catalog'
import { createWooCommerceCatalogSource } from './infrastructure/woocommerce-source'
import { createCatalogRoutes } from './transport/routes'

type CreateCatalogModuleOptions = {
  env: AppEnv
  db: DbClient
  source?: CatalogSource
  clock?: CatalogClock
}

const systemClock: CatalogClock = {
  now: () => new Date(),
}

export function createCatalogModule({ env, db, source, clock = systemClock }: CreateCatalogModuleOptions) {
  const service = new CatalogService({
    cacheTtlMs: env.CATALOG_CACHE_TTL_SECONDS * 1000,
    clock,
    source: source ?? sourceFromEnv(env),
  })

  return {
    routes: createCatalogRoutes(service, new RestockService(service, Boolean(env.ORDER_TELEGRAM_BOT_TOKEN && env.ORDER_TELEGRAM_CHAT_ID), createRestockQueue(db))),
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
export { deliverRestockNotification } from './infrastructure/restock-notifications'
export { CatalogFailure } from './domain/catalog'
export type {
  CatalogAvailability,
  CatalogListQuery,
  CatalogProduct,
  CatalogProductVariant,
  CatalogSort,
} from './domain/catalog'
export type { CatalogClock, CatalogSource } from './application/ports'
