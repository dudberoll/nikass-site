import { expect, test } from 'bun:test'

import { buildChatSystemPrompt } from './knowledge-base'

test('builds a grounded prompt with the energy formula and anti-guessing rules', () => {
  const prompt = buildChatSystemPrompt('Основной тон: дружелюбный.')

  expect(prompt).toContain('Основной тон: дружелюбный.')
  expect(prompt).toContain('требуемые Wh = сумма')
  expect(prompt).toContain('Не выдумывай характеристики')
  expect(prompt).toContain('два телефона по 15 Вт')
  expect(prompt).toContain('[Название товара](/catalog/точный-slug)')
  expect(prompt).toContain('/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah')
})
