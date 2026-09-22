import { expect, test } from "@playwright/test";

test("catalog opens below the desktop header trigger", async ({ page }) => {
  await page.goto("/");

  const catalogTrigger = page.getByRole("button", { name: "Каталог" });
  await expect(catalogTrigger).toHaveAttribute("aria-expanded", "false");
  await catalogTrigger.click();

  await expect(catalogTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-catalog-dropdown]")).toBeVisible();
  await expect(page.locator("[data-menu-backdrop]")).toBeHidden();
  await expect(page.getByRole("link", { name: /Все товары/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("[data-catalog-dropdown]")).toBeHidden();
  await expect(catalogTrigger).toHaveAttribute("aria-expanded", "false");
});

test("finds by SKU and keeps a checked cart through checkout navigation", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await expect(page.locator("[data-product-card]")).toHaveCount(9);
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.getByRole("link", { name: "Выбрать вариант" }).last().click();
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByLabel("Корзина").click();
  await expect(page.getByRole("heading", { name: "NIKASS Автомобильный инвертор" })).toBeVisible();
  await page.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(page.locator(".cart-summary-row").first()).toContainText("2");
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("group", { name: "Личные данные" })).toBeVisible();
});

test("product page shows availability and related products", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("2365402536");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.locator("[data-product-card] a[href^='/catalog/']").first().click();
  await expect(page.getByText("В наличии", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "С этим товаром покупают" })).toBeVisible();
  const related = await page.locator(".product-related .orbea-bestseller-card").count();
  expect(related).toBeGreaterThan(0);
  expect(related).toBeLessThanOrEqual(4);
});

test("portable station description opens the dacha article", async ({ page }) => {
  const productPath = "/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah";
  await page.goto(productPath);

  await page.getByRole("link", { name: "Читать полностью" }).click();
  await expect(page).toHaveURL(/\/blog\/energy-at-dacha\?from=%2Fcatalog%2F/);
  const returnLink = page.getByRole("link", { name: "Вернуться в каталог" });
  await expect(returnLink).toBeVisible();
  await expect(returnLink).toHaveAttribute("href", productPath);
  await returnLink.click();
  await expect(page).toHaveURL(new RegExp(`${productPath}$`));

  await page.goto("/blog/energy-at-dacha");
  await expect(page.getByRole("link", { name: "Вернуться в каталог" })).toBeHidden();
});

test("product page adds the selected quantity", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await page.locator("[data-product-card] a[href^='/catalog/']").first().click();

  const quantity = page.getByRole("group", { name: /Количество/ });
  await quantity.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(quantity.locator("span")).toHaveText("2");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(page.getByRole("status")).toContainText("2 шт.");
});

test("checkout offers delivery and pickup before the address step", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await page.locator("[data-product-card] a[href^='/catalog/']").first().click();
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByLabel("Корзина").click();
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();

  await page.getByLabel("Имя и фамилия").fill("Анна Иванова");
  await page.getByLabel("Телефон").fill("+7 999 123-45-67");
  await page.getByLabel("Email").fill("anna@example.test");
  await page.getByRole("button", { name: "Перейти к способу доставки" }).click();
  const deliveryStep = page.locator("fieldset:not([hidden])");
  await expect(deliveryStep).toBeVisible();
  await expect(deliveryStep.getByRole("button", { name: /Доставка/ })).toBeVisible();
  await expect(deliveryStep.getByRole("button", { name: /Самовывоз/ })).toBeVisible();
  await deliveryStep.getByRole("button", { name: /Самовывоз/ }).click();
  await page.getByRole("button", { name: "Перейти к адресу" }).click();
  const addressStep = page.locator("fieldset:not([hidden])");
  await expect(addressStep).toBeVisible();
  await expect(addressStep.getByLabel("Информация о самовывозе").getByText("Москва, ул. Лесная, 3", { exact: true })).toBeVisible();
  await expect(addressStep.locator("#addressSearch")).toHaveCount(0);
});

test("product details are collapsed and only one disclosure opens at a time", async ({ page }) => {
  await page.goto("/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah");

  const disclosures = page.locator("details.product-detail-disclosure");
  const characteristics = disclosures.nth(0);
  const packageContents = disclosures.nth(1);
  const delivery = disclosures.nth(2);
  await expect(characteristics).not.toHaveAttribute("open", "");
  await expect(packageContents).not.toHaveAttribute("open", "");
  await expect(delivery).not.toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs:visible")).toHaveCount(0);
  await expect(packageContents.locator("ul")).toBeHidden();
  await expect(delivery.locator("p")).toBeHidden();

  await characteristics.locator("summary").click();
  await expect(characteristics).toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs:visible")).toBeVisible();
  expect(await characteristics.locator(".product-specs:visible tbody").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);
  await packageContents.locator("summary").click();
  await expect(characteristics).not.toHaveAttribute("open", "");
  await expect(packageContents).toHaveAttribute("open", "");
  await expect(packageContents.locator("ul")).toBeVisible();
  await delivery.locator("summary").click();
  await expect(packageContents).not.toHaveAttribute("open", "");
  await expect(delivery).toHaveAttribute("open", "");
  await expect(delivery.locator("p")).toBeVisible();
});

test("NS-31 characteristics follow the selected variant", async ({ page }) => {
  await page.goto("/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2");
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", "/assets/images/sl31-station.png");
  await expect(page.getByRole("heading", { name: "Портативная зарядная станция NS-31" })).toBeVisible();
  await expect(page.locator(".product-sku")).toContainText("NS-31-150");
  await expect(page.locator(".product-variant-summary")).toContainText("SKU NS-31-150");

  const characteristics = page.locator(".product-characteristics-disclosure");
  await characteristics.locator("summary").click();
  const visibleSpecs = characteristics.locator(".product-specs:visible");
  await expect(visibleSpecs).toContainText("150 Вт");
  await expect(visibleSpecs).toContainText("230 × 130 × 220 мм");
  await expect(visibleSpecs).not.toContainText("IP21");

  await page.getByRole("button", { name: /300 Вт/ }).click();
  await expect(visibleSpecs).toContainText("300 Вт");
  await expect(visibleSpecs).toContainText("230 × 135 × 220 мм");
  await expect(visibleSpecs).toContainText("IP21");
  await expect(visibleSpecs).not.toContainText("230 × 130 × 220 мм");
});

test("moves from personal details to the Yandex-assisted delivery address", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("3204442838");
  await expect(page.locator("[data-product-card]")).toHaveCount(1);
  await page.getByRole("link", { name: "Выбрать вариант" }).last().click();
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByLabel("Корзина").click();
  await page.getByRole("button", { name: "Перейти к оформлению" }).click();

  await expect(page.getByRole("group", { name: "Личные данные" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Адрес доставки" })).toBeHidden();
  await expect(page.getByPlaceholder("Имя и фамилия")).toBeVisible();
  await expect(page.getByPlaceholder("Телефон")).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toBeVisible();
  await page.getByRole("button", { name: "Перейти к способу доставки" }).click();

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
  await page.getByRole("button", { name: "Перейти к способу доставки" }).click();
  await page.getByRole("button", { name: /Доставка/ }).click();
  await page.getByRole("button", { name: "Перейти к адресу" }).click();

  await expect(page.getByRole("group", { name: "Личные данные" })).toBeHidden();
  await expect(page.getByRole("group", { name: "Адрес" })).toBeVisible();
  await expect(page.locator('fieldset:not([hidden]) label[for="addressSearch"]')).toHaveCount(0);
  await expect(page.getByPlaceholder("Дом / корпус")).toBeVisible();
  await expect(page.locator('fieldset:not([hidden]) label[for="comment"]')).toBeVisible();
  await expect(page.locator('fieldset:not([hidden]) label[for="promoCode"]')).toBeVisible();
  const manualAddressButton = page.getByRole("button", { name: "Ввести адрес вручную" });
  if (await manualAddressButton.isVisible()) await manualAddressButton.click();
  await expect(page.getByPlaceholder("Регион / область")).toBeVisible();
  await expect(page.getByPlaceholder("Город")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Улица", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Квартира / офис (необязательно)")).toBeVisible();
  await expect(page.getByPlaceholder("Почтовый индекс")).toBeVisible();
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

  const carousel = page.getByRole("region", { name: "Категории товаров" });
  const products = carousel.locator("[data-hero-product]");
  await expect(products).toHaveCount(4);

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

test("consultation CTA opens the chat widget", async ({ page }) => {
  await page.goto("/");
  const widget = page.locator("[data-chat-widget]");
  const panel = widget.locator(".orbea-chat-widget-panel");
  const restore = page.getByRole("button", { name: "Открыть чат" });
  const trigger = page.locator("#custom").getByRole("button", { name: "Получить консультацию" });
  await expect(restore).toBeVisible();

  await restore.click();
  await expect(restore).toBeHidden();
  await page.getByRole("button", { name: "Свернуть чат" }).click();
  await expect(restore).toBeVisible();

  await trigger.click();
  await expect(widget).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Закрыть консультанта" })).toBeFocused();
  expect(await panel.evaluate((node) => {
    const { width, height } = node.getBoundingClientRect();
    return window.innerWidth <= 767
      ? Math.abs(width - window.innerWidth) < 1 && height > 0
      : width <= Math.min(window.innerWidth * 0.7, 980) + 1 && width > 0 && height > 0;
  })).toBe(true);

  await page.getByRole("button", { name: "Закрыть консультанта" }).click();
  await expect(restore).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("empty mobile chat keeps the composer above the shortened viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport regression");
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть чат" }).click();
  await page.getByRole("button", { name: "Open prompt input" }).click({ force: true });
  await expect(page.getByRole("textbox", { name: "Prompt" })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 360 });
  expect(await page.locator(".ai-assistant-card-composer").evaluate((composer) => {
    const composerBox = composer.getBoundingClientRect();
    const panelBox = composer.closest(".ai-assistant-card")?.getBoundingClientRect();
    return panelBox ? composerBox.bottom <= panelBox.bottom + 1 : false;
  })).toBe(true);
});
