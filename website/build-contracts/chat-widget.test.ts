import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("public static pages ship one shared chat, while cart, checkout and demos do not", () => {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  const excluded = new Set(["cart/index.html", "checkout/index.html", "chat/index.html", "message-scroller/index.html"]);
  const pages = readdirSync(dist, { recursive: true }).filter((file) => typeof file === "string" && /(^|\/)index\.html$/.test(file));
  assert.ok(pages.length > 0);
  for (const file of pages) {
    const html = readFileSync(resolve(dist, String(file)), "utf8");
    assert.equal([...html.matchAll(/id="nikass-chat-widget"/g)].length, excluded.has(String(file)) ? 0 : 1, String(file));
  }
});
