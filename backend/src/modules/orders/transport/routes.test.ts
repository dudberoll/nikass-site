import { expect, test } from 'bun:test'
import { createOrdersModule } from '../index'
import { loadEnv } from '../../../env'
import { handleError } from '../../../http/errors'
import type { DbClient } from '../../../db'

test('guest quote validates address before touching storage and disabled provider fails closed', async () => {
  const env = loadEnv({ DATABASE_URL: 'postgresql://localhost/test', JWT_SECRET: 'a'.repeat(32) })
  const routes = createOrdersModule({ env, db: {} as DbClient }).routes
  routes.onError(handleError)
  const post = (body: unknown) => routes.request('/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  expect((await post({})).status).toBe(400)
  const response = await post({ cart: { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 1 }] }, customer: { name: 'Анна Иванова', phone: '+79991234567', email: 'a@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', apartment: '', postcode: '123456', comment: 'Звонок', consent: true }, promoCode: '' })
  expect(response.status).toBe(503)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})
