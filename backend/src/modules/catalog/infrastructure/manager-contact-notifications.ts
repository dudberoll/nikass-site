import { createHash } from 'node:crypto'
import { z } from 'zod'
import { managerContactRequestSchema, restockChannelLabels } from '@web-app-demo/contracts'
import type { DbClient } from '../../../db'
import type { AppEnv } from '../../../env'
import { AppError } from '../../../http/errors'
import { enqueueTask, TerminalTaskError } from '../../../outbox'
import type { BackendRuntime } from '../../../runtime'
import type { ManagerContactNotification } from '../application/manager-contact-service'

const notificationSchema = z.object({ request: managerContactRequestSchema, name: z.string().min(1), label: z.string().min(1) })

export function createManagerContactQueue(db: DbClient) {
  return async (notification: ManagerContactNotification) => {
    const dedupeKey = createHash('sha256').update(JSON.stringify(notification.request)).digest('hex')
    try {
      await db.$transaction(async (tx) => {
        await tx.managerContactRequest.createMany({ data: [{ dedupeKey, details: notification as never }], skipDuplicates: true })
        const request = await tx.managerContactRequest.findUniqueOrThrow({ where: { dedupeKey } })
        if (request.notifiedAt) return
        const task = await enqueueTask(tx, { type: 'catalog:manager-contact-notify', dedupeKey: request.id, payload: { id: request.id } })
        const row = await tx.taskOutbox.findUniqueOrThrow({ where: { id: task.id }, select: { status: true } })
        if (row.status === 'failed' || row.status === 'skipped') throw new Error('Delivery failed')
      })
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Не удалось передать запрос менеджеру. Попробуйте ещё раз.')
    }
  }
}

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
