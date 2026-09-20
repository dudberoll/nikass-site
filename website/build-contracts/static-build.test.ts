import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

test("ships the Astra homepage and every product route from the API snapshot", () => {
  const home = readFileSync(resolve(dist, "index.html"), "utf8");
  assert.match(home, /Энергия без привязки/);
  assert.match(home, /orbea-hero/);
  const catalog = readFileSync(resolve(dist, "catalog/index.html"), "utf8");
  const routes = [...catalog.matchAll(/href="\/catalog\/([^"/]+)"/g)].map((entry) => entry[1]);
  const uniqueRoutes = new Set(routes);
  assert.equal(uniqueRoutes.size, 9);
  for (const slug of uniqueRoutes) {
    assert.ok(existsSync(resolve(dist, `catalog/${slug}/index.html`)), `missing route ${slug}`);
  }
});

test("ships related products, variant state, cart and contract-backed checkout hydration", () => {
  const catalog = readFileSync(resolve(dist, "catalog/index.html"), "utf8");
  const slug = "portativnaya-zaryadnaya-stantsiya-300-w-72000-mah";
  assert.ok(existsSync(resolve(dist, `catalog/${slug}/index.html`)));
  const product = readFileSync(resolve(dist, `catalog/${slug}/index.html`), "utf8");
  assert.match(product, /С этим товаром покупают/);
  assert.match(product, /data-cart-stage="ready"/);
  assert.match(product, /В наличии/);
  for (const route of ["cart/index.html", "checkout/index.html"]) {
    const html = readFileSync(resolve(dist, route), "utf8");
    assert.match(html, /client="load"/);
    assert.match(html, /href="\/catalog"/);
  }
});
