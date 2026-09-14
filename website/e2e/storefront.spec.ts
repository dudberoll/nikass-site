import { expect, test } from "@playwright/test";

test("finds by SKU and keeps a checked cart through checkout navigation", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.locator("[data-product-card]")).toHaveCount(21);
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(page.getByRole("status")).toContainText("добавлен в корзину");
  await page.getByRole("link", { name: /Корзина 1/ }).click();
  await expect(page.getByRole("heading", { name: "Инвертор автомобильный 1200" })).toBeVisible();
  await page.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(page.locator(".cart-summary-row").first()).toContainText("2");
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("group", { name: "Личные данные" })).toBeVisible();
});

test("product page shows availability and related products", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.locator("[data-product-card] a[href^='/catalog/']").first().click();
  await expect(page.getByText("В наличии", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "С этим товаром покупают" })).toBeVisible();
  const related = await page.locator(".product-related .orbea-bestseller-card").count();
  expect(related).toBeGreaterThan(0);
  expect(related).toBeLessThanOrEqual(4);
});

test("product details are collapsed and expand downward", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await page.locator("[data-product-card] a[href^='/catalog/']").first().click();

  const disclosures = page.locator("details.product-detail-disclosure");
  const characteristics = disclosures.nth(0);
  const delivery = disclosures.nth(1);
  await expect(characteristics).not.toHaveAttribute("open", "");
  await expect(delivery).not.toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs")).toBeHidden();
  await expect(delivery.locator("p")).toBeHidden();

  await characteristics.locator("summary").click();
  await expect(characteristics).toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs")).toBeVisible();
  await delivery.locator("summary").click();
  await expect(delivery).toHaveAttribute("open", "");
  await expect(delivery.locator("p")).toBeVisible();
});

test("moves from personal details to the Yandex-assisted delivery address", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByRole("link", { name: /Корзина 1/ }).click();
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();

  await expect(page.getByRole("group", { name: "Личные данные" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Адрес доставки" })).toBeHidden();
  await page.getByRole("button", { name: "Перейти к адресу" }).click();

  await expect(page.getByRole("alert")).toContainText("Проверьте отмеченные поля.");
  const fieldErrors = page.locator(".checkout-field-control.has-error .checkout-error");
  await expect(fieldErrors).toHaveCount(3);
  expect(await fieldErrors.evaluateAll((nodes) => nodes.map((node) => {
    const field = node.parentElement?.getBoundingClientRect();
    const error = node.getBoundingClientRect();
    return Boolean(field && error.top >= field.top && error.bottom <= field.bottom && error.left >= field.left && error.right <= field.right);
  }))).toEqual([true, true, true]);

  await page.getByLabel("Имя и фамилия").fill("Анна Иванова");
  await page.getByLabel("Телефон").fill("+7 999 123-45-67");
  await page.getByLabel("Email").fill("anna@example.test");
  await page.getByRole("button", { name: "Перейти к адресу" }).click();

  await expect(page.getByRole("group", { name: "Личные данные" })).toBeHidden();
  await expect(page.getByRole("group", { name: "Адрес доставки" })).toBeVisible();
  const addressLabels = await page.locator("fieldset:not([hidden]) label:visible").allTextContents();
  expect(addressLabels.slice(0, 4)).toEqual(["Регион / область", "Город", "Улица", "Дом / корпус"]);
  await expect(page.locator("#manual-address-fields")).toBeVisible();
  await expect(page.locator("#addressSearch")).toBeHidden();

  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(page.getByLabel("Регион / область")).toBeFocused();
});

test("solution CTA points to the system builder", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Подобрать решение" }).click();
  await expect(page).toHaveURL(/\/#custom$/);
});

test("hero carousel centers a side product before opening it", async ({ page }, testInfo) => {
  await page.goto("/");

  const carousel = page.getByRole("region", { name: "Рекомендуемые товары" });
  const products = carousel.locator("[data-hero-product]");
  await expect(products).toHaveCount(5);

  const sideProduct = carousel.locator('[data-hero-position="1"]');
  const target = await sideProduct.getAttribute("href");
  const targetProduct = carousel.locator(`[data-hero-product][href="${target}"]`);
  await targetProduct.click();

  await expect(targetProduct).toHaveAttribute("data-hero-position", "0");
  await expect(targetProduct.locator(".orbea-hero-product-name")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  if (testInfo.project.name === "mobile") {
    await carousel.locator("[data-hero-viewport]").dispatchEvent("pointerdown", { clientX: 300, pointerType: "touch" });
    await carousel.locator("[data-hero-viewport]").dispatchEvent("pointerup", { clientX: 100, pointerType: "touch" });
    await expect(targetProduct).toHaveAttribute("data-hero-position", "-1");
    return;
  }

  await targetProduct.click();
  await expect(page).toHaveURL(target!);
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
