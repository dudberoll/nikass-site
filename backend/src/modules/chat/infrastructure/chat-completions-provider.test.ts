import { expect, test } from 'bun:test'

import { createChatCompletionsProvider } from './chat-completions-provider'

test('sends the system prompt and conversation to a chat-completions endpoint', async () => {
  let request: { model: string; messages: unknown[] } | undefined
  const provider = createChatCompletionsProvider({
    apiKey: 'test-key',
    apiUrl: 'https://ai.example.test/v1/chat/completions',
    model: 'test-model',
    requestTimeoutMs: 1_000,
    systemPrompt: 'Ты консультант NIKASS.',
    fetchImpl: async (_input, init) => {
      request = JSON.parse(String(init?.body)) as typeof request
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Подберу решение.' } }] }), { status: 200 })
    },
  })

  await expect(provider.respond([{ role: 'user', content: 'Нужна станция для дома.' }])).resolves.toBe('Подберу решение.')
  expect(request).toEqual({
    model: 'test-model',
    messages: [
      { role: 'system', content: 'Ты консультант NIKASS.' },
      { role: 'user', content: 'Нужна станция для дома.' },
    ],
  })
})
