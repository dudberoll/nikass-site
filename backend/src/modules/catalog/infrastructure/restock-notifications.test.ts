import { expect, test } from 'bun:test'
import type { DbClient } from '../../../db'
import { loadEnv } from '../../../env'
import { deliverRestockNotification } from './restock-notifications'

const env = loadEnv({ DATABASE_URL: 'postgresql://localhost/test', JWT_SECRET: '12345678901234567890123456789012',
  ORDER_TELEGRAM_BOT_TOKEN: 'test-token', ORDER_TELEGRAM_CHAT_ID: 'test-chat' })
const notification = { name: 'Станция', label: '300 Вт', request: { requestId: '00000000-0000-4000-8000-000000000001',
  slug: 'station', sku: 'SOURCE-SKU', channel: 'telegram', contact: '@customer_test', consent: true, website: '' } }

const payload = { id: '00000000-0000-4000-8000-000000000002' }
const updates: unknown[] = []
const prisma = { restockRequest: { findUnique: async () => ({ id: payload.id, details: notification, notifiedAt: null }),
  update: async (input: unknown) => { updates.push(input); } } } as unknown as DbClient

test('delivers the chosen contact and exact variant as plain text to the manager', async () => {
  const signal = new AbortController().signal
  let message: { text: string; chat_id: string; parse_mode?: string } | undefined
  await deliverRestockNotification(payload, { env, prisma }, signal, (async (_url, init) => {
    expect(init?.signal).toBe(signal)
    expect(init?.redirect).toBe('error')
    message = JSON.parse(String(init?.body))
    return Response.json({ ok: true })
  }))
  expect(message?.chat_id).toBe('test-chat')
  expect(message?.text).toContain('SKU: SOURCE-SKU')
  expect(message?.text).toContain('Контакт: @customer_test')
  expect(message?.text).toContain('Вариант: 300 Вт')
  expect(message?.parse_mode).toBeUndefined()
  expect(updates).toHaveLength(1)
  expect(updates[0]).toMatchObject({ data: { details: {} } })
})

test('fails safely for Telegram errors and invalid payloads so the outbox can retry', async () => {
  for (const reply of [Response.json({ ok: false }), Response.json({ ok: true }, { status: 500 }), new Response('invalid')]) {
    await expect(deliverRestockNotification(payload, { env, prisma }, new AbortController().signal,
      (async () => reply))).rejects.toThrow('Restock Telegram delivery failed')
  }
  await expect(deliverRestockNotification(payload, { env, prisma }, new AbortController().signal,
    (async () => { throw new Error('URL containing test-token') }))).rejects.toThrow('Restock Telegram delivery failed')
  await expect(deliverRestockNotification({}, { env, prisma }, new AbortController().signal)).rejects.toThrow('Invalid restock notification payload')
  expect(updates).toHaveLength(1)
})

test('does not resend an already delivered request', async () => {
  const delivered = { restockRequest: { findUnique: async () => ({ notifiedAt: new Date() }) } } as unknown as DbClient
  await deliverRestockNotification(payload, { env, prisma: delivered }, new AbortController().signal,
    async () => { throw new Error('Already delivered requests must not reach Telegram') })
})
