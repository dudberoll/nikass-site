import { expect, test } from "@playwright/test";

test("demo discounted variants cover all categories and share the cart without entering checkout", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  const regularCount = await page.locator("[data-product-card]").count();
  await expect(page.getByText("Тестовый экземпляр", { exact: true })).toHaveCount(0);

  await page.locator(".catalog-category-buttons").getByRole("link", { name: "Уценённые товары" }).click();
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Категории товаров" })).toHaveCount(0);
  await expect(page.getByLabel("Поиск по каталогу", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Сортировка товаров" })).toBeVisible();
  await expect(page.locator(".catalog-category-buttons").getByRole("link", { name: "Уценённые товары" })).toHaveCount(0);
  const back = page.getByRole("link", { name: "Вернуться в каталог" });
  await expect(back).toHaveAttribute("href", "/catalog");
  const backBounds = await back.boundingBox();
  const headingBounds = await page.getByRole("heading", { name: "Уценённые товары", exact: true }).boundingBox();
  expect(backBounds!.y + backBounds!.height).toBeLessThan(headingBounds!.y);
  await back.click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("button", { name: "Все товары", exact: true })).toBeVisible();
  await page.locator(".catalog-category-buttons").getByRole("link", { name: "Уценённые товары" }).click();
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.locator("[data-product-card]")).toHaveCount(regularCount);
  await expect(page.locator('[data-product-card][data-variant-count="1"]')).toHaveCount(regularCount);
  await expect(page.locator("[data-product-card] del")).toHaveCount(regularCount);
  await page.goto(`/discounted?category=${encodeURIComponent("Портативные зарядные станции")}`);
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.locator("[data-product-card]")).toHaveCount(regularCount);
  await expect(page.getByRole("navigation", { name: "Категории товаров" })).toHaveCount(0);
  await page.locator("[data-product-card]").first().getByRole("link", { name: "Выбрать вариант" }).click();
  await expect(page.getByText(/Тестовый экземпляр — для проверки/)).toBeVisible();
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(page.getByRole("status")).toContainText("Товар добавлен");

  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.locator("[data-product-card]").first().getByRole("link", { name: "Выбрать вариант" }).click();
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByLabel("Корзина", { exact: true }).click();
  await expect(page.locator(".cart-line")).toHaveCount(2);
  const checkout = page.getByRole("button", { name: "Перейти к оформлению" });
  await expect(checkout).toBeDisabled();
  await expect(page.getByText("Удалите тестовые экземпляры из корзины, чтобы оформить заказ.")).toBeVisible();
  await page.locator(".cart-line").filter({ hasText: "Тестовый экземпляр — не продаётся" }).getByRole("button", { name: "Удалить" }).click();
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await expect(checkout).toBeEnabled();
});
