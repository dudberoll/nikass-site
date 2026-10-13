import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { HERO_CATEGORIES } from "../src/data/catalog";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

test("ships the Astra homepage and every product route from the API snapshot", () => {
  const home = readFileSync(resolve(dist, "index.html"), "utf8");
  assert.match(home, /Энергия без привязки/);
  assert.match(home, /orbea-hero/);
  assert.ok(home.includes('<link rel="canonical" href="https://nikass.ru/"'));
  const catalog = readFileSync(resolve(dist, "catalog/index.html"), "utf8");
  const routes = [...catalog.matchAll(/href="\/catalog\/([^"/]+)"/g)].map((entry) => entry[1]).filter((slug) => slug !== "category");
  const uniqueRoutes = new Set(routes);
  assert.equal(uniqueRoutes.size, 9);
  for (const slug of uniqueRoutes) {
    assert.ok(existsSync(resolve(dist, `catalog/${slug}/index.html`)), `missing route ${slug}`);
    const page = readFileSync(resolve(dist, `catalog/${slug}/index.html`), "utf8");
    if (page.includes('<meta name="robots" content="noindex,follow"')) {
      assert.doesNotMatch(page, /data-product-structured-data/);
      continue;
    }
    assert.ok(page.includes(`<link rel="canonical" href="https://nikass.ru/catalog/${slug}"`));
    const structuredDataMatch = page.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(structuredDataMatch, `missing product structured data for ${slug}`);
    const structuredData = JSON.parse(structuredDataMatch[1]);
    const variants: Array<{ offers?: { priceCurrency?: string } }> = structuredData["@type"] === "ProductGroup" ? structuredData.hasVariant : [structuredData];
    assert.ok(["Product", "ProductGroup"].includes(structuredData["@type"]));
    assert.equal(structuredData.brand?.name, "NIKASS");
    assert.ok(variants.every((variant) => !variant.offers || variant.offers.priceCurrency === "RUB"));
  }
  const sitemap = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
  for (const category of HERO_CATEGORIES) {
    const page = readFileSync(resolve(dist, `catalog/category/${category.slug}/index.html`), "utf8");
    assert.ok(page.includes(`<title>${category.seoTitle}</title>`));
    assert.ok(page.includes(`<h1>${category.label}</h1>`));
    assert.ok(page.includes(`<meta name="description" content="${category.description}"`));
    assert.ok(page.includes(`<link rel="canonical" href="https://nikass.ru/catalog/category/${category.slug}"`));
    assert.match(page, /<article class="store-product-card"/);
    assert.ok(sitemap.includes(`https://nikass.ru/catalog/category/${category.slug}`));
  }
});

test("ships related products, variant state, cart and contract-backed checkout hydration", () => {
  const slug = "portativnaya-zaryadnaya-stantsiya-300-w-72000-mah";
  assert.ok(existsSync(resolve(dist, `catalog/${slug}/index.html`)));
  const product = readFileSync(resolve(dist, `catalog/${slug}/index.html`), "utf8");
  assert.match(product, /Рекомендуем в комплект/);
  assert.match(product, /data-cart-stage="ready"/);
  assert.match(product, /В наличии/);
  for (const route of ["cart/index.html", "checkout/index.html"]) {
    const html = readFileSync(resolve(dist, route), "utf8");
    assert.match(html, /client="load"/);
    assert.match(html, /href="\/catalog"/);
  }
});
