import { expect, test } from 'bun:test'
import { restockRequestSchema } from './restock'

const request = { requestId: '00000000-0000-4000-8000-000000000001', slug: 'station', sku: 'S1', consent: true, website: '' }
test('validates and normalizes contacts for each restock channel', () => {
  for (const [channel, contact, normalized] of [
    ['phone', '8 (999) 123-45-67', '+79991234567'], ['whatsapp', '+7 999 123-45-67', '+79991234567'],
    ['telegram', 'https://t.me/customer_test', '@customer_test'], ['max', 'https://max.ru/u/customer_test', 'https://max.ru/u/customer_test'],
  ]) expect(restockRequestSchema.parse({ ...request, channel, contact }).contact).toBe(normalized)
  for (const input of [{ channel: 'whatsapp', contact: '@username' }, { channel: 'telegram', contact: 'Имя' },
    { channel: 'max', contact: 'https://example.com/profile' }, { channel: 'phone', contact: '123' },
    { channel: 'telegram', contact: '@customer_test', consent: false }, { channel: 'phone', contact: '+79991234567', website: 'spam' },
    { channel: 'phone', contact: '+79991234567', price: 1 }]) {
    expect(restockRequestSchema.safeParse({ ...request, ...input }).success).toBe(false)
  }
})
