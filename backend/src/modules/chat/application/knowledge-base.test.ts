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

test('includes website payment, delivery and return terms with their conditions', () => {
  const prompt = buildChatSystemPrompt('')

  for (const term of [
    '/payment-and-delivery', 'Visa, MasterCard и Мир', 'СБП', 'если СДЭК поддерживает',
    'закрывающие документы', 'со склада в Москве', 'на следующий рабочий день',
    'веса и габаритов всех товаров', 'не входит в онлайн-оплату товаров',
    '/return-policy', 'в течение 7 дней с момента получения', 'полный комплект',
    'предварительного согласования', 'номер заказа и причину обращения',
    'доставку оплачивает покупатель', 'доставку оплачивает продавец',
    'до 10 рабочих дней после получения и проверки товара',
    'Не обещай', 'не принимает обращения',
  ]) expect(prompt).toContain(term)
})
