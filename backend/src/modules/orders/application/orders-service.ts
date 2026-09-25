import { createHash, randomBytes } from 'node:crypto'
import { orderQuoteRequestSchema, orderTotalsSchema, type OrderQuoteRequest } from '@web-app-demo/contracts'
import { OrderFailure, type OrderProvider, type OrderStore, type CheckoutAttempt } from './ports'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const result = (row: CheckoutAttempt) => ({ state: row.state, orderNumber: row.orderNumber })

export class OrdersService {
  constructor(private readonly store: OrderStore, private readonly provider: OrderProvider, private readonly allowSubmission = true) {}

  async quote(value: OrderQuoteRequest) {
    const input = orderQuoteRequestSchema.parse(value)
    const { cartToken, totals } = await this.provider.quote(input)
    const checkedTotals = orderTotalsSchema.parse(totals)
    const checkoutToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60_000)
    await this.store.create(hash(checkoutToken), cartToken, input, checkedTotals, expiresAt)
    return { checkoutToken, expiresAt: expiresAt.toISOString(), totals: checkedTotals }
  }

  async status(token: string) { return result(await this.find(token)) }

  async submit(token: string) {
    if (!this.allowSubmission) throw new OrderFailure('unavailable', 'В тестовом режиме реальные заказы не создаются.')
    const row = await this.find(token)
    if (row.state !== 'quoted') return result(row)
    if (row.expiresAt.getTime() <= Date.now()) throw new OrderFailure('conflict', 'Расчёт устарел. Проверьте заказ заново.')
    const input = orderQuoteRequestSchema.parse(row.input)
    const totals = orderTotalsSchema.parse(row.totals)
    if (!row.cartToken) throw new OrderFailure('conflict', 'Корзина недоступна. Проверьте заказ заново.')
    if (!await this.store.claim(row.id, new Date())) return this.status(token)
    let orderNumber: string
    try {
      orderNumber = await this.provider.submit(row.cartToken, input, totals)
    } catch (error) {
      // A lost response may mean WooCommerce created the order. Never retry the remote write.
      const state = error instanceof OrderFailure && error.kind === 'invalid' ? 'rejected' : 'uncertain'
      await this.store.fail(row.id, state)
      if (state === 'rejected') throw error
      return { state: 'uncertain' as const, orderNumber: null }
    }
    // If this transaction fails, the durable submitting state blocks duplicate remote writes.
    await this.store.finish(row.id, orderNumber)
    return { state: 'confirmed' as const, orderNumber }
  }

  private async find(token: string) {
    const row = await this.store.find(hash(token))
    if (!row) throw new OrderFailure('not_found', 'Заказ не найден.')
    return row
  }
}
