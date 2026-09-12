import assert from 'node:assert/strict'
import test from 'node:test'

import { chatRequestSchema, chatResponseSchema } from './chat'

test('chat contracts bound conversation size and normalize text', () => {
  assert.deepEqual(
    chatRequestSchema.parse({ messages: [{ role: 'user', content: '  Привет  ' }] }),
    { messages: [{ role: 'user', content: 'Привет' }] },
  )
  assert.throws(() => chatRequestSchema.parse({ messages: [] }))
  assert.throws(() => chatResponseSchema.parse({ reply: '' }))
})
