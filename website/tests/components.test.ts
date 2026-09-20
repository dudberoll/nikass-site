import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const page = readFileSync(fileURLToPath(new URL('../src/pages/components.astro', import.meta.url)), 'utf8')
const component = readFileSync(fileURLToPath(new URL('../src/components/ReviewsFigmaSection.astro', import.meta.url)), 'utf8')
const header = readFileSync(fileURLToPath(new URL('../src/components/StoreHeader.astro', import.meta.url)), 'utf8')

test('components page exposes the Figma reviews section', () => {
  assert.match(page, /<ReviewsFigmaSection \/>/)
  const storeNav = header.match(/<nav class="store-nav"[\s\S]*?<\/nav>/)?.[0] ?? ''
  assert.doesNotMatch(storeNav, /href="\/catalog"|href="\/components"|Каталог|Компоненты/)
  assert.match(component, /Более 10000 заказов/)
  assert.match(component, /10000 отзывов/)
  assert.match(component, /Все отзывы/)
  assert.match(component, /flex: 0 0 333px/)
  assert.match(component, /font-size: 36px/)
  assert.match(component, /padding: 28px 0 48px/)
})
