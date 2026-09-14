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

test('offers the energy calculator only for a routed energy question and uses its result', async () => {
  const requests: Array<Record<string, unknown>> = []
  const provider = createChatCompletionsProvider({
    apiKey: 'test-key',
    apiUrl: 'https://ai.example.test/v1/chat/completions',
    model: 'test-model',
    requestTimeoutMs: 1_000,
    systemPrompt: 'Ты консультант NIKASS.',
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push(body)
      if (requests.length === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_energy',
                type: 'function',
                function: {
                  name: 'calculate_energy_budget',
                  arguments: JSON.stringify({
                    stationCapacityWh: 205,
                    stationMaxOutputW: 300,
                    devices: [{ name: 'телевизор', powerW: 65 }],
                  }),
                },
              }],
            },
          }],
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Хватит примерно на 2,3 часа.' } }] }), { status: 200 })
    },
  })

  await expect(provider.respond(
    [{ role: 'user', content: 'На сколько хватит станции 205 Wh для телевизора 65 Вт?' }],
    { useEnergyTool: true },
  )).resolves.toBe('Хватит примерно на 2,3 часа.')

  expect(requests[0]?.tools).toBeArray()
  expect(requests[0]?.tool_choice).toBe('auto')
  expect(requests[0]?.parallel_tool_calls).toBe(false)
  expect(requests[1]?.tools).toBeUndefined()
  expect((requests[1]?.messages as Array<{ role: string }>).at(-1)?.role).toBe('tool')
  expect((requests[1]?.messages as Array<{ role: string; content?: string }>).at(-1)?.content).toContain('runtimeHours')
  expect((requests[1]?.messages as Array<{ role: string; content?: string }>).at(-1)?.content).toContain('"fits":null')
})
