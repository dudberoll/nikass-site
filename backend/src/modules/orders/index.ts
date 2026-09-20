import type { AppEnv } from '../../env'
import type { DbClient } from '../../db'
import { OrdersService } from './application/orders-service'
import { PaymentsService } from './application/payments-service'
import { OrderFailure, PaymentFailure, type OrderProvider, type PaymentProvider } from './application/ports'
import { createOrderStore } from './infrastructure/orders-store'
import { createWooCommerceOrders } from './infrastructure/woocommerce-orders'
import { createYooKassaPayments } from './infrastructure/yookassa-payments'
import { createOrderRoutes } from './transport/routes'

export function createOrdersModule({ env, db, provider }: { env: AppEnv; db: DbClient; provider?: OrderProvider }) {
  const disabled = async (): Promise<never> => { throw new OrderFailure('unavailable', 'Оформление временно недоступно. Попробуйте позже.') }
  const source = provider ?? (env.ORDERS_ENABLED && env.WOOCOMMERCE_PRODUCTS_ENDPOINT && env.WOOCOMMERCE_STORE_ENDPOINT && env.WOOCOMMERCE_CONSUMER_KEY && env.WOOCOMMERCE_CONSUMER_SECRET
    ? createWooCommerceOrders({ productsEndpoint: env.WOOCOMMERCE_PRODUCTS_ENDPOINT, storeEndpoint: env.WOOCOMMERCE_STORE_ENDPOINT, consumerKey: env.WOOCOMMERCE_CONSUMER_KEY, consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET, timeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS })
    : { quote: disabled, submit: disabled })
  const emailEnabled = Boolean(env.ORDER_MANAGER_EMAIL && ['postbox', 'resend'].includes(env.EMAIL_DELIVERY))
  const store = createOrderStore(db, emailEnabled)
  const paymentProvider: PaymentProvider = env.YOO_KASSA_ENABLED && env.YOO_KASSA_SHOP_ID && env.YOO_KASSA_SECRET_KEY
    ? createYooKassaPayments({ apiUrl: env.YOO_KASSA_API_URL, shopId: env.YOO_KASSA_SHOP_ID, secretKey: env.YOO_KASSA_SECRET_KEY, timeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS })
    : { create: async (): Promise<never> => { throw new PaymentFailure('unavailable', 'Онлайн-оплата пока не подключена.') }, get: async (): Promise<never> => { throw new PaymentFailure('unavailable', 'Онлайн-оплата пока не подключена.') } }
  return { routes: createOrderRoutes(new OrdersService(store, source), new PaymentsService(store, paymentProvider, env.YOO_KASSA_RETURN_URL ?? '', env.YOO_KASSA_TEST_MODE)) }
}
export type { OrderProvider } from './application/ports'
export { deliverOrderNotification } from './infrastructure/notifications'
export { fulfillPayment } from './infrastructure/payment-fulfillment'
