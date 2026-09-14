import { expect, test } from 'bun:test'

import { ChatService } from './chat-service'

test('routes energy-duration questions to the deterministic calculator tool', async () => {
  let useEnergyTool: boolean | undefined
  const service = new ChatService({
    respond: async (_messages, options) => {
      useEnergyTool = options?.useEnergyTool
      return 'Расчёт готов.'
    },
  })

  await expect(service.respond({
    messages: [{ role: 'user', content: 'Хватит ли станции 205 Wh на телевизор 65 Вт на 3 часа?' }],
  })).resolves.toEqual({ reply: 'Расчёт готов.' })
  expect(useEnergyTool).toBe(true)
})

test('does not invoke a tool for a factual product question', async () => {
  let useEnergyTool: boolean | undefined
  const service = new ChatService({
    respond: async (_messages, options) => {
      useEnergyTool = options?.useEnergyTool
      return 'В комплекте есть адаптер.'
    },
  })

  await service.respond({ messages: [{ role: 'user', content: 'Что входит в комплект?' }] })
  expect(useEnergyTool).toBe(false)
})

