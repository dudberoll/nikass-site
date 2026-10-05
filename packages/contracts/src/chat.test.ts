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

test('chat accepts 200 messages and rejects the next message', () => {
  const messages = Array.from({ length: 200 }, () => ({ role: 'user', content: 'Привет' }))
  assert.equal(chatRequestSchema.parse({ messages }).messages.length, 200)
  assert.throws(() => chatRequestSchema.parse({ messages: [...messages, messages[0]] }))
})

test('a valid assistant reply can be sent back in conversation history', () => {
  const { reply } = chatResponseSchema.parse({ reply: 'Я'.repeat(12_000) })
  assert.equal(chatRequestSchema.parse({
    messages: [{ role: 'assistant', content: reply }, { role: 'user', content: 'Продолжим' }],
  }).messages[0]?.content, reply)
  assert.throws(() => chatRequestSchema.parse({ messages: [{ role: 'user', content: 'Я'.repeat(4_001) }] }))
  assert.throws(() => chatRequestSchema.parse({ messages: [{ role: 'assistant', content: `${reply}Я` }] }))
})
