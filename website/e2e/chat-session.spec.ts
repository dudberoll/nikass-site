import { expect, test } from "@playwright/test";

test("chat follows public pages, retains replies and drafts, and stays out of checkout", async ({ page }) => {
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { reply: "Сохранённый ответ консультанта." } });
  });
  await page.goto("/catalog");
  const launcher = page.getByRole("button", { name: "Открыть чат", exact: true });
  await expect(launcher).toBeVisible();
  const catalogPosition = await launcher.boundingBox();
  await launcher.click();
  const chat = page.locator("[data-chat-widget]");
  await expect(chat.locator("[data-chat-hydrated=true]")).toBeAttached();
  await chat.getByRole("button", { name: "Open prompt input" }).click();
  await chat.getByRole("textbox", { name: "Prompt", exact: true }).fill("Вопрос о доставке");
  await chat.getByRole("button", { name: "Send prompt" }).click();
  await expect(chat.locator(".ai-chat-bubble").last()).toHaveText("Сохранённый ответ консультанта.");
  await expect(chat.locator("[aria-busy=false]")).toBeAttached();
  await chat.getByRole("textbox", { name: "Prompt", exact: true }).fill("Черновик вопроса");
  await chat.getByRole("button", { name: "Свернуть чат", exact: true }).click();
  await page.locator(".store-footer-links").getByRole("link", { name: "О компании", exact: true }).click();
  await expect(launcher).toBeVisible();
  expect(await launcher.boundingBox()).toEqual(catalogPosition);
  await launcher.click();
  await expect(chat.getByRole("textbox", { name: "Prompt", exact: true })).toHaveValue("Черновик вопроса");
  await expect(chat.locator(".ai-chat-bubble").first()).toHaveText("Вопрос о доставке");
  await expect(chat.locator(".ai-chat-bubble").last()).toHaveText("Сохранённый ответ консультанта.");
  await page.reload();
  await launcher.click();
  await expect(chat.getByRole("textbox", { name: "Prompt", exact: true })).toHaveValue("Черновик вопроса");
  await chat.getByRole("button", { name: "Send prompt" }).click();
  await expect(chat.locator("[aria-busy=false]")).toBeAttached();
  expect(requests[1]?.messages).toEqual([
    { role: "user", content: "Вопрос о доставке" },
    { role: "assistant", content: "Сохранённый ответ консультанта." },
    { role: "user", content: "Черновик вопроса" },
  ]);
  for (const path of ["/cart", "/checkout"]) {
    await page.goto(path);
    await expect(chat).toHaveCount(0);
  }
  await page.goto("/");
  await expect(launcher).toBeVisible();
  expect(await launcher.boundingBox()).toEqual(catalogPosition);
  await launcher.click();
  await expect(chat.locator(".ai-chat-message")).toHaveCount(4);
  await chat.getByRole("button", { name: "Начать новый чат" }).click();
  await expect(chat.locator(".ai-chat-message")).toHaveCount(0);
  await page.reload();
  await launcher.click();
  await expect(chat.locator("[data-chat-hydrated=true]")).toBeAttached();
  await expect(chat.locator(".ai-chat-message")).toHaveCount(0);
});

test("navigation during typing keeps the full reply and reset cancels a pending answer", async ({ page }) => {
  const reply = "Этот ответ должен сохраниться целиком. ".repeat(30);
  await page.route("**/api/chat", (route) => route.fulfill({ json: { reply } }));
  await page.goto("/?chat=open");
  const chat = page.locator("[data-chat-widget]");
  await expect(chat).toHaveAttribute("aria-modal", "true");
  await expect(chat.locator("[data-chat-hydrated=true]")).toBeAttached();
  await chat.getByRole("button", { name: "Доставка и возврат", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("nikass-chat") ?? "{}").messages?.at(-1)?.content)).toBe(reply.trim());
  await expect(chat.locator("[aria-busy=true]")).toBeAttached();
  await chat.getByRole("button", { name: "Закрыть консультанта", exact: true }).click();
  await page.getByRole("link", { name: "Смотреть каталог", exact: true }).click();
  await page.getByRole("button", { name: "Открыть чат", exact: true }).click();
  await expect(chat.locator(".ai-chat-bubble").last()).toHaveText(reply.trim());
  await chat.getByRole("button", { name: "Свернуть чат", exact: true }).click();
  await page.goBack();
  await page.getByRole("button", { name: "Открыть чат", exact: true }).click();
  await expect(chat.locator(".ai-chat-bubble").last()).toHaveText(reply.trim());
  await chat.getByRole("button", { name: "Начать новый чат" }).click();
  let releaseReply: () => void = () => {};
  const delayedReply = new Promise<void>((resolve) => { releaseReply = resolve; });
  await page.unroute("**/api/chat");
  await page.route("**/api/chat", async (route) => {
    await delayedReply;
    await route.fulfill({ json: { reply: "Отменённый ответ" } }).catch(() => {});
  });
  const request = page.waitForRequest("**/api/chat");
  await chat.getByRole("button", { name: "Доставка и возврат", exact: true }).click();
  await request;
  await chat.getByRole("button", { name: "Начать новый чат" }).click();
  releaseReply();
  await expect(chat.locator(".ai-chat-message")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Открыть чат", exact: true }).click();
  await expect(chat.locator("[data-chat-hydrated=true]")).toBeAttached();
  await expect(chat.locator(".ai-chat-message")).toHaveCount(0);
});

test("blocked browser storage leaves chat usable and warns about losing history", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new Error("Storage blocked"); } });
  });
  await page.route("**/api/chat", (route) => route.fulfill({ json: { reply: "Ответ без хранилища" } }));
  await page.goto("/about");
  await page.getByRole("button", { name: "Открыть чат", exact: true }).click();
  const chat = page.locator("[data-chat-widget]");
  await expect(chat.getByRole("status")).toContainText("Не удалось сохранить переписку");
  await chat.getByRole("button", { name: "Доставка и возврат", exact: true }).click();
  await expect(chat.locator(".ai-chat-bubble").last()).toHaveText("Ответ без хранилища");
});
