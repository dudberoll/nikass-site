import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

function productCard(page: Page, name: string) {
  return page.locator('[data-slot="card"].catalog-card').filter({ hasText: name }).first()
}

async function addProduct(page: Page, name: string) {
  const card = productCard(page, name)
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Добавить', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Добавлено ✓', exact: true })).toBeVisible()
}

async function openCart(page: Page) {
  await page.locator('.catalog-header').getByRole('link', { name: /Корзина/ }).click()
  await expect(page).toHaveURL(/\/cart\/?$/)
  await expect(page.locator('[data-cart-view]')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/catalog')
  await page.evaluate(() => window.sessionStorage.clear())
  await expect(page.locator('astro-island[component-export="CatalogExplorer"]')).not.toHaveAttribute('ssr')
  await expect(page.getByRole('heading', { level: 2, name: 'Вся витрина' })).toBeVisible()
})

test('adds a product, changes its quantity, and removes it', async ({ page }) => {
  await addProduct(page, 'NIKASS NS-31')
  await expect(page.locator('.catalog-header').getByRole('link', { name: /Корзина 1/ })).toBeVisible()

  await openCart(page)

  const line = page.locator('[data-cart-line]').filter({ hasText: 'NIKASS NS-31' }).first()
  await expect(line).toBeVisible()
  await expect(line.locator('[data-cart-quantity]')).toHaveText('1')
  await expect(page.locator('[data-cart-total]')).toContainText('24 990')

  await line.getByRole('button', { name: 'Увеличить количество NIKASS NS-31' }).click()
  await expect(line.locator('[data-cart-quantity]')).toHaveText('2')
  await expect(page.locator('[data-cart-total]')).toContainText('49 980')

  await line.getByRole('button', { name: 'Уменьшить количество NIKASS NS-31' }).click()
  await expect(line.locator('[data-cart-quantity]')).toHaveText('1')

  await line.getByRole('button', { name: 'Удалить' }).click()
  await expect(page.locator('[data-cart-empty]')).toBeVisible()
  await expect(page.locator('[data-cart-line]')).toHaveCount(0)
  await expect(page.locator('.catalog-header').getByRole('link', { name: /Корзина 0/ })).toBeVisible()
})

test('adds multiple products and clears the cart', async ({ page }) => {
  await addProduct(page, 'NIKASS NS-31')
  await addProduct(page, 'NIKASS Power 20')
  await expect(page.locator('.catalog-header').getByRole('link', { name: /Корзина 2/ })).toBeVisible()

  await openCart(page)
  await expect(page.locator('[data-cart-line]')).toHaveCount(2)
  await expect(page.locator('[data-cart-total]')).toContainText('29 980')

  await page.getByRole('button', { name: 'Очистить корзину' }).click()
  await expect(page.locator('[data-cart-empty]')).toBeVisible()
  await expect(page.locator('[data-cart-line]')).toHaveCount(0)
  await expect(page.locator('.catalog-header').getByRole('link', { name: /Корзина 0/ })).toBeVisible()
})

test('keeps the cart after reloading the current tab', async ({ page }) => {
  await addProduct(page, 'NIKASS NS-31')
  await page.reload()

  await expect(page.locator('.catalog-header').getByRole('link', { name: /Корзина 1/ })).toBeVisible()
  await openCart(page)
  await expect(page.locator('[data-cart-line]').filter({ hasText: 'NIKASS NS-31' })).toBeVisible()
})
