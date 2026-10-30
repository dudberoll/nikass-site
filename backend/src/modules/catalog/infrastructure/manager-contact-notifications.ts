import { z } from 'zod'
import { managerContactRequestSchema, restockChannelLabels } from '@web-app-demo/contracts'
import type { AppEnv } from '../../../env'
import { TerminalTaskError } from '../../../outbox'
import type { BackendRuntime } from '../../../runtime'

const notificationSchema = z.object({ request: managerContactRequestSchema, name: z.string().min(1), label: z.string().min(1) })

// Finish previously queued requests; new contacts use direct storefront links.
export async function deliverManagerContactNotification(payload: unknown, runtime: Pick<BackendRuntime, 'env' | 'prisma'>, signal: AbortSignal,
  fetchImpl: (input: string, init: RequestInit) => Promise<Response> = fetch) {
  const task = z.object({ id: z.uuid() }).safeParse(payload)
  if (!task.success) throw new TerminalTaskError('Invalid manager contact payload')
  const row = await runtime.prisma.managerContactRequest.findUnique({ where: { id: task.data.id } })
  if (!row) throw new TerminalTaskError('Manager contact request missing')
  if (row.notifiedAt) return
  const parsed = notificationSchema.safeParse(row.details)
  if (!parsed.success) throw new TerminalTaskError('Invalid manager contact notification')
  const { request, name, label } = parsed.data
  const env: AppEnv = runtime.env
  if (!env.ORDER_TELEGRAM_BOT_TOKEN || !env.ORDER_TELEGRAM_CHAT_ID) throw new Error('Manager Telegram delivery is not configured')
  const text = ['Запрос: связаться с менеджером', `Товар: ${name.slice(0, 300)}`, `Вариант: ${label.slice(0, 300)}`,
    `Способ связи: ${restockChannelLabels[request.channel]}`, `Контакт: ${request.contact}`,
    'Согласие на обработку контакта: получено', `Запрос: ${request.requestId}`].join('\n')
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${env.ORDER_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.ORDER_TELEGRAM_CHAT_ID, text }), signal,
    })
    const body = await response.json().catch(() => null) as { ok?: boolean } | null
    if (!response.ok || body?.ok !== true) throw new Error('Delivery failed')
  } catch { throw new Error('Manager Telegram delivery failed') }
  await runtime.prisma.managerContactRequest.update({ where: { id: row.id }, data: { notifiedAt: new Date(), details: {} } })
}
