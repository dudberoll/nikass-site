import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const page = readFileSync(fileURLToPath(new URL('../src/pages/components.astro', import.meta.url)), 'utf8')
const component = readFileSync(fileURLToPath(new URL('../src/components/ReviewsFigmaSection.astro', import.meta.url)), 'utf8')
const header = readFileSync(fileURLToPath(new URL('../src/components/StoreHeader.astro', import.meta.url)), 'utf8')

test('every page declares the dedicated iPhone home-screen icon', () => {
  const pages = fileURLToPath(new URL('../src/pages/', import.meta.url))
  for (const path of readdirSync(pages, { recursive: true, encoding: 'utf8' })) {
    if (!path.endsWith('.astro')) continue
    const source = readFileSync(`${pages}/${path}`, 'utf8')
    assert.match(source, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180" \/>/, path)
  }
  const icon = readFileSync(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)))
  assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(icon.readUInt32BE(16), 180)
  assert.equal(icon.readUInt32BE(20), 180)
  assert.equal(icon[25], 2, 'the PNG must have an opaque RGB background')
})

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
