import { expect, test } from '@playwright/test'

function productCard(page: import('@playwright/test').Page, name: string) {
  return page.locator('[data-slot="card"].catalog-card').filter({ hasText: name }).first()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/catalog')
  await page.evaluate(() => window.sessionStorage.clear())
  await expect(page.locator('astro-island[component-export="CatalogExplorer"]')).not.toHaveAttribute('ssr')
  await expect(page.getByRole('heading', { level: 2, name: 'Вся витрина' })).toBeVisible()
})

test('visits all five categories and finds their products', async ({ page }) => {
  for (const category of [
    ['charging-stations', 'NIKASS NS-31'],
    ['power-banks', 'NIKASS Power 20'],
    ['solar-panels', 'NIKASS Solar 100'],
    ['inverters', 'NIKASS Inverter 1600'],
    ['agm-batteries', 'NIKASS AGM 100'],
  ]) {
    await page.locator('#catalog-category').selectOption(category[0])
    await expect(productCard(page, category[1])).toBeVisible()
    await expect(page.locator('.catalog-results')).toContainText('из 10')
  }
})

test('checks variant selection, preorder, and unavailable product states', async ({ page }) => {
  const station = productCard(page, 'NIKASS NS-31')
  await station.locator('#catalog-variant-nikass-ns-31').selectOption('NS31-600-576')
  await expect(station.locator('.catalog-card__status')).toHaveText('Предзаказ')
  await expect(station.getByRole('button', { name: 'Добавить', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: 'Показать ещё', exact: true }).click()
  const unavailable = productCard(page, 'NIKASS Solar 200')
  await expect(unavailable).toContainText('Недоступен')
  await expect(unavailable.getByRole('button', { name: 'Недоступно', exact: true })).toBeDisabled()

  await station.getByRole('link', { name: 'Открыть NIKASS NS-31' }).click()
  await expect(page).toHaveURL(/\/catalog\/nikass-ns-31\/?$/)
  await page.locator('[data-variant-sku="NS31-600-576"]').click()
  await expect(page.locator('[data-product-sku]')).toHaveText('NS31-600-576')
  await expect(page.locator('.product-variant-selector [data-product-price]')).toContainText('45 990')
  await expect(page.getByText('Предзаказ', { exact: true }).last()).toBeVisible()
})

test('progressively reveals products and keeps an HTML page variant', async ({ page }) => {
  const cards = page.locator('#catalog-results-grid [data-slot="card"]')
  await expect(cards).toHaveCount(6)
  await expect(page.getByRole('button', { name: 'Показать ещё', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Показать ещё', exact: true }).click()
  await expect(cards).toHaveCount(10)
  await expect(page.getByRole('button', { name: 'Показать ещё', exact: true })).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Страницы каталога' }).getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/\/catalog\/page\/2\/?$/)
  await expect(page.locator('.catalog-html-page__description')).toContainText('Страница 2 из 2')
  await expect(page.locator('.catalog-grid [data-slot="card"]')).toHaveCount(4)
  await expect(page.getByRole('link', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('does not overflow the selected viewport', async ({ page }) => {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)
})
