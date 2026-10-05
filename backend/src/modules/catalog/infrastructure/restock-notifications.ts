import { createHash } from 'node:crypto'
import { z } from 'zod'
import { restockChannelLabels, restockRequestSchema } from '@web-app-demo/contracts'
import type { DbClient } from '../../../db'
import type { AppEnv } from '../../../env'
import { AppError } from '../../../http/errors'
import { enqueueTask, TerminalTaskError } from '../../../outbox'
import type { BackendRuntime } from '../../../runtime'
import type { RestockNotification } from '../application/restock-service'

const notificationSchema = z.object({ request: restockRequestSchema, name: z.string().min(1), label: z.string().min(1) })

export function createRestockQueue(db: DbClient) {
  return async (notification: RestockNotification) => {
    // Hash the normalized request, so retry keys contain no contact and changed contacts cannot collide.
    const dedupeKey = createHash('sha256').update(JSON.stringify(notification.request)).digest('hex')
    try {
      await db.$transaction(async (tx) => {
        await tx.restockRequest.createMany({ data: [{ dedupeKey, details: notification as never }], skipDuplicates: true })
        const request = await tx.restockRequest.findUniqueOrThrow({ where: { dedupeKey } })
        if (request.notifiedAt) return
        const task = await enqueueTask(tx, { type: 'catalog:restock-notify', dedupeKey: request.id, payload: { id: request.id } })
        const row = await tx.taskOutbox.findUniqueOrThrow({ where: { id: task.id }, select: { status: true } })
        if (row.status === 'failed' || row.status === 'skipped') throw new Error('Delivery failed')
      })
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Не удалось сохранить заявку. Попробуйте ещё раз.')
    }
  }
}

export async function deliverRestockNotification(payload: unknown, runtime: Pick<BackendRuntime, 'env' | 'prisma'>, signal: AbortSignal,
  fetchImpl: (input: string, init: RequestInit) => Promise<Response> = fetch) {
  const task = z.object({ id: z.uuid() }).safeParse(payload)
  if (!task.success) throw new TerminalTaskError('Invalid restock notification payload')
  const row = await runtime.prisma.restockRequest.findUnique({ where: { id: task.data.id } })
  if (!row) throw new TerminalTaskError('Restock request missing')
  if (row.notifiedAt) return
  const parsed = notificationSchema.safeParse(row.details)
  if (!parsed.success) throw new TerminalTaskError('Invalid restock notification payload')
  const { request, name, label } = parsed.data
  const env: AppEnv = runtime.env
  if (!env.ORDER_TELEGRAM_BOT_TOKEN || !env.ORDER_TELEGRAM_CHAT_ID) throw new Error('Manager Telegram delivery is not configured')
  const text = ['Заявка: сообщить о поступлении', `Товар: ${name.slice(0, 300)}`, `Вариант: ${label.slice(0, 300)}`,
    `SKU: ${request.sku}`, `Способ связи: ${restockChannelLabels[request.channel]}`, `Контакт: ${request.contact}`,
    `Согласие на обработку контакта: получено`, `Заявка: ${request.requestId}`].join('\n')
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${env.ORDER_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.ORDER_TELEGRAM_CHAT_ID, text }), signal,
    })
    const body = await response.json().catch(() => null) as { ok?: boolean } | null
    if (!response.ok || body?.ok !== true) throw new Error('Delivery failed')
  } catch { throw new Error('Restock Telegram delivery failed') }
  await runtime.prisma.restockRequest.update({ where: { id: row.id }, data: { notifiedAt: new Date(), details: {} } })
}
