import { z } from 'zod'
import { orderQuoteRequestSchema, orderTotalsSchema } from '@web-app-demo/contracts'
import type { BackendRuntime } from '../../../runtime'
import { TerminalTaskError } from '../../../outbox'

export async function deliverOrderNotification(payload: unknown, runtime: BackendRuntime, signal: AbortSignal) {
  const input = z.object({ id: z.string().uuid(), channel: z.enum(['email', 'telegram']) }).safeParse(payload)
  if (!input.success) throw new TerminalTaskError('Invalid order notification payload')
  const row = await runtime.prisma.checkoutAttempt.findUnique({ where: { id: input.data.id } })
  if (!row || row.state !== 'confirmed') throw new TerminalTaskError('Confirmed order missing')
  const { customer, promoCode } = orderQuoteRequestSchema.parse(row.input)
  const totals = orderTotalsSchema.parse(row.totals)
  const text = [
    `Новый заказ №${row.orderNumber}`,
    ...totals.items.map((item) => `${item.sku}: ${item.quantity} шт., ${(item.totalMinor / 100).toFixed(2)} ₽`),
    `Итого: ${(totals.totalMinor / 100).toFixed(2)} ₽. Доставка СДЭК бесплатно.`,
    `Промокод: ${promoCode || 'нет'}`,
    `${customer.name}, ${customer.phone}, ${customer.email}`,
    `${customer.postcode}, ${customer.region}, ${customer.city}, ${customer.street}, д. ${customer.house}${customer.apartment ? `, кв. ${customer.apartment}` : ''}`,
    `Комментарий: ${customer.comment}`,
  ].join('\n')
  if (input.data.channel === 'email') {
    if (!runtime.env.ORDER_MANAGER_EMAIL || !runtime.emailDelivery.configured || runtime.emailDelivery.driver === 'console') throw new Error('Manager email delivery is not configured')
    await runtime.emailDelivery.send({ to: runtime.env.ORDER_MANAGER_EMAIL, subject: `NIKASS: заказ №${row.orderNumber}`, text }, { signal })
    return
  }
  if (!runtime.env.ORDER_TELEGRAM_BOT_TOKEN || !runtime.env.ORDER_TELEGRAM_CHAT_ID) throw new Error('Manager Telegram delivery is not configured')
  // Telegram messages are bounded; include a summary, with the full order in WooCommerce/email.
  const message = `Новый заказ NIKASS №${row.orderNumber}\nСумма: ${(totals.totalMinor / 100).toFixed(2)} ₽\nПозиций: ${totals.items.length}\nКонтакты и адрес — в WooCommerce и письме.`
  let response: Response
  try {
    response = await fetch(`https://api.telegram.org/bot${runtime.env.ORDER_TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: runtime.env.ORDER_TELEGRAM_CHAT_ID, text: message }), signal })
  } catch { throw new Error('Telegram delivery failed') }
  const body = await response.json().catch(() => null) as { ok?: boolean } | null
  if (!response.ok || body?.ok !== true) throw new Error('Telegram delivery failed')
}
