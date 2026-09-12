import { expect, test } from "@playwright/test";

test("finds by SKU and keeps a checked cart through checkout navigation", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.locator("[data-product-card]")).toHaveCount(24);
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(page.getByRole("status")).toContainText("добавлен в корзину");
  await page.getByRole("link", { name: /Корзина 1/ }).click();
  await expect(page.getByRole("heading", { name: /NIKASS Инвертор/ })).toBeVisible();
  await page.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(page.locator(".cart-summary-row").first()).toContainText("2");
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("group", { name: "Контакты и адрес доставки" })).toBeVisible();
});

test("product page shows availability and related products", async ({ page }) => {
  await page.goto("/catalog/3204442838");
  await expect(page.getByText("В наличии", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "С этим товаром покупают" })).toBeVisible();
  const related = await page.locator(".product-related .orbea-bestseller-card").count();
  expect(related).toBeGreaterThan(0);
  expect(related).toBeLessThanOrEqual(4);
});

test("keeps checkout validation messages inside their fields", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Добавить в корзину" }).first().click();
  await page.getByRole("link", { name: /Корзина 1/ }).click();
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();
  await page.getByRole("button", { name: "Проверить заказ и промокод" }).click();

  await expect(page.getByRole("alert")).toContainText("Проверьте отмеченные поля.");
  const fieldErrors = page.locator(".checkout-field-control.has-error .checkout-error");
  await expect(fieldErrors).toHaveCount(9);
  expect(await fieldErrors.evaluateAll((nodes) => nodes.map((node) => {
    const field = node.parentElement?.getBoundingClientRect();
    const error = node.getBoundingClientRect();
    return Boolean(field && error.top >= field.top && error.bottom <= field.bottom && error.left >= field.left && error.right <= field.right);
  }))).toEqual([true, true, true, true, true, true, true, true, true]);
});

test("solution CTA points to the existing stories block", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Подобрать решение" }).click();
  await expect(page).toHaveURL(/\/#stories$/);
});

test("consultation CTA opens a compact chat widget", async ({ page }) => {
  await page.goto("/");
  const widget = page.locator("[data-chat-widget]");
  const trigger = page.getByRole("button", { name: "Получить консультацию" });
  await expect(widget).toBeHidden();

  await trigger.click();
  await expect(widget).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Закрыть консультанта" })).toBeFocused();
  expect(await widget.evaluate((node) => {
    const { width } = node.getBoundingClientRect();
    return window.innerWidth <= 767
      ? Math.abs(width - window.innerWidth) < 1
      : width <= window.innerWidth * 0.4 && width > 0;
  })).toBe(true);

  await page.getByRole("button", { name: "Закрыть консультанта" }).click();
  await expect(widget).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});
