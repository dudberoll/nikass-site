import { expect, test } from '@playwright/test'
const cart = { version: 1, items: [{ slug: 'station', sku: 'S1', quantity: 2 }] }
const quote = { checkoutToken: 'a'.repeat(64), expiresAt: new Date(Date.now() + 900000).toISOString(), totals: { currency: 'RUB', items: [{ sku: 'S1', name: 'Зарядная станция', quantity: 2, totalMinor: 1800 }], discountMinor: 200, shippingMinor: 0, totalMinor: 1800 } }

for (const width of [390, 1280]) {
  test(`guest checkout preserves attempt across reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    let submissions = 0
    await page.route('**/api/orders/quote', async (route) => {
      const input = route.request().postDataJSON()
      expect(input.customer.phone).toBe('+79991234567')
      expect(input.promoCode).toBe('sale10')
      await route.fulfill({ json: quote })
    })
    await page.route('**/api/orders', async (route) => { submissions++; await route.abort() })
    await page.route('**/api/orders/status', async (route) => { await route.fulfill({ json: { state: 'confirmed', orderNumber: 'N-42' } }) })
    await page.goto(`/checkout#${new URLSearchParams({ cart: JSON.stringify(cart) })}`)
    await expect(page.getByLabel('Имя и фамилия')).toBeVisible()
    await expect(page).toHaveURL(/\/checkout$/)
    await page.getByRole('button', { name: 'Проверить заказ и промокод' }).click()
    await expect(page.getByRole('alert')).toContainText('Проверьте')
    for (const [name, value] of Object.entries({ name: 'Анна Иванова', phone: '8 (999) 123-45-67', email: 'anna@example.test', region: 'Москва', city: 'Москва', street: 'Лесная', house: '3', postcode: '123456', comment: 'Позвонить перед доставкой', promoCode: 'SALE10' })) await page.locator(`#${name}`).fill(value)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Проверить заказ и промокод' }).click()
    await expect(page.getByRole('heading', { name: 'Проверьте итоговую сумму' })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('nikass-checkout'))).not.toContain('anna@example.test')
    await page.getByRole('button', { name: 'Подтвердить и оформить заказ' }).click()
    await expect(page.getByRole('alert')).toContainText('Ответ не получен')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Заказ №N-42' })).toBeVisible()
    expect(submissions).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
