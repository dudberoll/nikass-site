import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

test("ships the Astra homepage and all 24 product routes", () => {
  const home = readFileSync(resolve(dist, "index.html"), "utf8");
  assert.match(home, /Энергия без привязки/);
  assert.match(home, /orbea-hero/);
  const routes = readFileSync(resolve(dist, "catalog/index.html"), "utf8").match(/data-product-card/g) ?? [];
  assert.equal(routes.length, 24);
  for (const entry of readFileSync(resolve(process.cwd(), "src/data/nikass_catalog_ozon.csv"), "utf8").matchAll(/^"(\d+)";/gm)) {
    assert.ok(existsSync(resolve(dist, `catalog/${entry[1]}/index.html`)), `missing route ${entry[1]}`);
    assert.ok(existsSync(resolve(dist, `products/${entry[1]}.webp`)), `missing image ${entry[1]}`);
  }
});

test("ships related products, variant state, cart and contract-backed checkout hydration", () => {
  const product = readFileSync(resolve(dist, "catalog/3204442838/index.html"), "utf8");
  assert.match(product, /С этим товаром покупают/);
  assert.match(product, /data-cart-stage="ready"/);
  assert.match(product, /В наличии/);
  for (const route of ["cart/index.html", "checkout/index.html"]) {
    const html = readFileSync(resolve(dist, route), "utf8");
    assert.match(html, /client="load"/);
    assert.match(html, /href="\/catalog"/);
  }
});
