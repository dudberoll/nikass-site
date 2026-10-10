import { z } from 'zod'
import { orderQuoteRequestSchema, orderTotalsSchema } from '@web-app-demo/contracts'
import type { BackendRuntime } from '../../../runtime'
import { TerminalTaskError } from '../../../outbox'

export async function deliverOrderNotification(payload: unknown, runtime: BackendRuntime, signal: AbortSignal,
  fetchImpl: (input: string, init: RequestInit) => Promise<Response> = fetch) {
  const input = z.object({ id: z.string().uuid(), channel: z.enum(['email', 'telegram']) }).safeParse(payload)
  if (!input.success) throw new TerminalTaskError('Invalid order notification payload')
  const row = await runtime.prisma.checkoutAttempt.findUnique({ where: { id: input.data.id } })
  if (input.data.channel === 'telegram' && (!row || row.state !== 'confirmed' || row.paymentState !== 'succeeded'
    || row.fulfillmentState !== 'confirmed' || !row.orderNumber)) return 'skipped' as const
  if (!row || row.state !== 'confirmed') throw new TerminalTaskError('Confirmed order missing')
  const { customer, promoCode } = orderQuoteRequestSchema.parse(row.input)
  const totals = orderTotalsSchema.parse(row.totals)
  const text = [
    `${row.paymentState === 'succeeded' ? 'Оплачен заказ NIKASS' : 'Новый заказ'} №${row.orderNumber}`,
    ...(runtime.env.YOO_KASSA_TEST_MODE ? ['Тестовая оплата'] : []),
    ...totals.items.map((item) => `${item.name} (SKU: ${item.sku}): ${item.quantity} шт., ${(item.totalMinor / 100).toFixed(2)} ₽`),
    `Итого: ${(totals.totalMinor / 100).toFixed(2)} ₽`,
    `Скидка: ${(totals.discountMinor / 100).toFixed(2)} ₽`,
    `Промокод: ${promoCode || 'нет'}`,
    `Покупатель: ${customer.name}`,
    `Телефон: ${customer.phone}`,
    `Email: ${customer.email}`,
    `Получение: ${customer.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка СДЭК'}`,
    ...(customer.cdekPoint ? [
      `Пункт СДЭК: ${customer.cdekPoint.name} (${customer.cdekPoint.code}), ${customer.cdekPoint.city}, ${customer.cdekPoint.address}`,
      `Стоимость СДЭК отдельно: ${customer.cdekPoint.shippingMinor === null ? 'подтвердить менеджеру' : `${(customer.cdekPoint.shippingMinor / 100).toFixed(2)} ₽ (ориентир)`}`,
    ] : []),
    `Адрес: ${customer.postcode}, ${customer.region}, ${customer.city}, ${customer.street}, д. ${customer.house}${customer.apartment ? `, кв. ${customer.apartment}` : ''}`,
    `Комментарий: ${customer.comment || 'нет'}`,
  ].join('\n')
  if (input.data.channel === 'email') {
    if (!runtime.env.ORDER_MANAGER_EMAIL || !runtime.emailDelivery.configured || runtime.emailDelivery.driver === 'console') throw new Error('Manager email delivery is not configured')
    await runtime.emailDelivery.send({ to: runtime.env.ORDER_MANAGER_EMAIL, subject: `NIKASS: заказ №${row.orderNumber}`, text }, { signal })
    return
  }
  if (!runtime.env.ORDER_TELEGRAM_BOT_TOKEN || !runtime.env.ORDER_TELEGRAM_CHAT_ID) throw new Error('Manager Telegram delivery is not configured')
  // ponytail: retries may repeat accepted parts; track per-part delivery only if duplicates become a problem.
  for (const message of text.match(/[\s\S]{1,4000}/gu) ?? []) {
    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${runtime.env.ORDER_TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: runtime.env.ORDER_TELEGRAM_CHAT_ID, text: message, protect_content: true,
          link_preview_options: { is_disabled: true } }), signal,
      })
      const body = await response.json().catch(() => null) as { ok?: boolean } | null
      if (!response.ok || body?.ok !== true) throw new Error('Delivery failed')
    } catch { throw new Error('Telegram delivery failed') }
  }
}
