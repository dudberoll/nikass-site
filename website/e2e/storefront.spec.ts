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
  const warranty = disclosures.nth(2);
  const delivery = disclosures.nth(3);
  await expect(characteristics).not.toHaveAttribute("open", "");
  await expect(packageContents).not.toHaveAttribute("open", "");
  await expect(delivery).not.toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs:visible")).toHaveCount(0);
  await expect(packageContents.locator("ul:visible")).toHaveCount(0);
  await expect(delivery.locator("p")).toBeHidden();

  await characteristics.locator("summary").click();
  await expect(characteristics).toHaveAttribute("open", "");
  await expect(characteristics.locator(".product-specs:visible")).toBeVisible();
  await packageContents.locator("summary").click();
  await expect(characteristics).not.toHaveAttribute("open", "");
  await expect(packageContents).toHaveAttribute("open", "");
  await expect(packageContents.locator("ul:visible")).toBeVisible();
  await warranty.locator("summary").click();
  await expect(packageContents).not.toHaveAttribute("open", "");
  await expect(warranty.locator("p:visible")).toHaveText("1 год со дня продажи");
  await delivery.locator("summary").click();
  await expect(packageContents).not.toHaveAttribute("open", "");
  await expect(delivery).toHaveAttribute("open", "");
  await expect(delivery.locator("p")).toBeVisible();
});

test("NS-31 characteristics follow the selected variant", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nikass.catalog-edits.v1", JSON.stringify({
    version: 1, products: { "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2": {
      characteristics: { "NS-31-150": [{ label: "Локальная подмена", value: "Старые данные" }] },
    } },
  })));
  await page.goto("/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2");
  await expect(page.locator("astro-island").filter({ has: page.locator(".product-variant-selector") })).not.toHaveAttribute("ssr", "");
  await expect(page.getByRole("heading", { name: "Портативная зарядная станция NS-31" })).toBeVisible();
  await expect(page.locator(".product-sku")).toContainText("NS-31-150");
  await expect(page.locator(".product-variant-summary")).toContainText("SKU NS-31-150");

  const characteristics = page.locator(".product-characteristics-disclosure");
  await characteristics.locator("summary").click();
  const visibleSpecs = characteristics.locator(".product-specs:visible");
  await expect(visibleSpecs).toContainText("150 Вт");
  await expect(visibleSpecs).toContainText("23 × 13 × 22 см");
  await expect(visibleSpecs).toContainText("153,6 Вт·ч");
  await expect(visibleSpecs).not.toContainText("Локальная подмена");
  await expect(visibleSpecs).not.toContainText("Гарантия");
  await expect(visibleSpecs).not.toContainText("Комплектация");

  await page.getByRole("button", { name: /300 Вт/ }).click();
  await expect(visibleSpecs).toContainText("300 Вт");
  await expect(visibleSpecs).toContainText("23 × 13 × 22 см");
  await expect(visibleSpecs).toContainText("307,2 Вт·ч");
  await expect(visibleSpecs).not.toContainText("153,6 Вт·ч");
  const kit = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Комплектация$/ }) });
  await kit.locator("summary").click();
  await expect(kit.locator('[data-product-detail-sku="NS-31-300"]')).toBeVisible();
  await expect(kit).toContainText("AC-адаптер");
  await expect(kit).toContainText("подарок от продавца");
  const warranty = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Гарантия$/ }) });
  await warranty.locator("summary").click();
  await expect(warranty.locator('[data-product-detail-sku="NS-31-300"]')).toHaveText("1 год со дня продажи");
});

test("WooCommerce photos follow the selected variant in catalog, product page and cart", async ({ page }) => {
  const api = process.env.CATALOG_BUILD_API_URL ?? "http://127.0.0.1:3000";
  const response = await page.request.get(`${api}/api/catalog?perPage=100`);
  expect(response.ok()).toBe(true);
  const { items } = await response.json();
  const images = ["PB-20", "PB-50", "PB-60"].map((sku) => items.find((item: { variants: Array<{ sku: string }> }) => item.variants.some((variant) => variant.sku === sku)).images[0]);
  expect(new Set(images).size).toBe(3);

  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  await page.getByLabel("Поиск по каталогу").fill("POWERBANK");
  const card = page.locator("[data-product-card]");
  await expect(card).toHaveCount(1);
  await expect(card.locator(".store-product-image img")).toHaveAttribute("src", images[0]);
  const choice50 = card.getByRole("button", { name: /50\s*000 мАч/ });
  await expect(choice50.locator("img")).toHaveAttribute("src", images[1]);
  await choice50.click();
  await expect(card.locator(".store-product-image img")).toHaveAttribute("src", images[1]);
  await card.getByRole("link", { name: "Выбрать вариант" }).click();
  await expect(page).toHaveURL(/variant=PB-50/);
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", images[1]);
  await page.reload();
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", images[1]);
  await page.getByRole("button", { name: /60\s*000 мАч/ }).click();
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", images[2]);
  await expect.poll(() => page.locator(".product-gallery img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByLabel("Корзина").click();
  await expect(page.locator(".cart-line-image img")).toHaveAttribute("src", images[2]);
  await page.locator(".cart-line-image").click();
  await expect(page).toHaveURL(/variant=PB-60/);
  await expect(page.locator(".product-gallery img")).toHaveAttribute("src", images[2]);
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


test("homepage variants persist into the product page and preorder displays pending price", async ({ page, request }) => {
  const response = await request.get(`${process.env.CATALOG_BUILD_API_URL ?? "http://127.0.0.1:3000"}/api/catalog?perPage=100`);
  expect(response.ok()).toBeTruthy();
  const { items } = await response.json();
  const model = items.find((item: { variants: Array<{ sku: string }> }) => item.variants.some((variant) => variant.sku === "NS-69-500"));
  const variant = model.variants.find((item: { sku: string }) => item.sku === "NS-69-500");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#bestsellers");
  const card = page.locator("#bestsellers [data-product-card]").first();
  await expect(card.locator("xpath=..")).not.toHaveAttribute("ssr", "");
  const choice = card.getByRole("button", { name: /500 Вт,/ });
  if (!(await choice.isVisible())) await card.getByRole("button", { name: /Ещё/ }).click();
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator(".orbea-bestseller-price strong")).toHaveText(`${new Intl.NumberFormat("ru-RU").format(variant.price)} ₽`);
  await expect(card.locator(".orbea-bestseller-image img")).toHaveAttribute("src", model.images[0]);
  await card.getByRole("link", { name: "Выбрать вариант", exact: true }).click();
  await expect(page).toHaveURL(/variant=NS-69-500/);
  await expect(page.locator(".product-variant-summary")).toContainText("SKU NS-69-500");

  await page.goto("/catalog");
  await expect(page.locator("[data-catalog-hydrated=true]")).toBeVisible();
  const solar = page.locator("[data-product-card]").filter({ has: page.getByRole("heading", { name: "Портативная солнечная панель", exact: true }) });
  const panel = items.find((item: { variants: Array<{ sku: string }> }) => item.variants.some((variant) => variant.sku === "SP-30"));
  await expect(solar.locator(".store-product-bottom strong")).toHaveText(`от ${new Intl.NumberFormat("ru-RU").format(panel.variants[0].price)} ₽`);
  const preorderPanel = solar.getByRole("button", { name: /450 Вт.*Цена уточняется/ });
  if (!(await preorderPanel.isVisible())) await solar.getByRole("button", { name: /Ещё/ }).click();
  await preorderPanel.click();
  await expect(preorderPanel).toHaveAttribute("aria-pressed", "true");
  await expect(solar.locator(".store-product-bottom strong")).toHaveText("Цена уточняется");
  await expect(solar.getByRole("button", { name: "Сообщить о поступлении", exact: true })).toBeVisible();
  await solar.getByRole("button", { name: /^30 Вт.*₽/ }).click();
  await expect(solar.locator(".store-product-bottom strong")).toHaveText(`${new Intl.NumberFormat("ru-RU").format(panel.variants[0].price)} ₽`);
  const waiting = page.locator("[data-product-card]").filter({ has: page.locator(".product-availability.is-preorder") });
  expect(await waiting.count()).toBeGreaterThan(0);
  for (const pending of await waiting.all()) {
    await expect(pending.locator(".store-product-bottom strong")).toHaveText("Цена уточняется");
    await expect(pending.locator(".store-product-bottom del")).toHaveCount(0);
  }
  await waiting.first().getByRole("link").first().click();
  await expect(page.locator(".product-variant-summary > strong")).toHaveText("Цена уточняется");
  await expect(page.locator(".product-variant-options strong")).not.toContainText(["100 ₽"]);
});
