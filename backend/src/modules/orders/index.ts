import type { AppEnv } from '../../env'
import type { DbClient } from '../../db'
import { OrdersService } from './application/orders-service'
import { OrderFailure, type OrderProvider } from './application/ports'
import { createOrderStore } from './infrastructure/orders-store'
import { createWooCommerceOrders } from './infrastructure/woocommerce-orders'
import { createOrderRoutes } from './transport/routes'

export function createOrdersModule({ env, db, provider }: { env: AppEnv; db: DbClient; provider?: OrderProvider }) {
  const disabled = async (): Promise<never> => { throw new OrderFailure('unavailable', 'Оформление временно недоступно. Попробуйте позже.') }
  const source = provider ?? (env.ORDERS_ENABLED && env.WOOCOMMERCE_PRODUCTS_ENDPOINT && env.WOOCOMMERCE_STORE_ENDPOINT && env.WOOCOMMERCE_CONSUMER_KEY && env.WOOCOMMERCE_CONSUMER_SECRET
    ? createWooCommerceOrders({ productsEndpoint: env.WOOCOMMERCE_PRODUCTS_ENDPOINT, storeEndpoint: env.WOOCOMMERCE_STORE_ENDPOINT, consumerKey: env.WOOCOMMERCE_CONSUMER_KEY, consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET, timeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS })
    : { quote: disabled, submit: disabled })
  return { routes: createOrderRoutes(new OrdersService(createOrderStore(db), source)) }
}
export type { OrderProvider } from './application/ports'
export { deliverOrderNotification } from './infrastructure/notifications'
