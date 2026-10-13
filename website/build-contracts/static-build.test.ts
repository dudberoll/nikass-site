import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { HERO_CATEGORIES } from "../src/data/catalog";
import { blogEntries } from "../src/data/blog";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function metaContent(html: string, property: string) {
  return html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`))?.[1];
}

function jsonLd(html: string, dataAttribute: string) {
  const match = html.match(new RegExp(`<script(?=[^>]*${dataAttribute})[^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing ${dataAttribute}`);
  return JSON.parse(match[1]);
}

function assertOpenGraph(html: string, path: string, type = "website") {
  for (const property of ["og:title", "og:description", "og:image", "og:image:alt", "og:url", "og:type"]) {
    assert.ok(metaContent(html, property), `missing ${property} for ${path}`);
  }
  assert.match(metaContent(html, "og:image") ?? "", /^https:\/\//);
  assert.equal(metaContent(html, "og:url"), `https://nikass.ru${path}`);
  assert.equal(metaContent(html, "og:type"), type);
}

function assertBreadcrumbList(html: string) {
  const data = jsonLd(html, "data-breadcrumb-structured-data");
  assert.equal(data["@type"], "BreadcrumbList");
  assert.ok(data.itemListElement.length >= 2);
  assert.deepEqual(data.itemListElement.map((item: { position: number }) => item.position), data.itemListElement.map((_: unknown, index: number) => index + 1));
}

test("ships the Astra homepage and every product route from the API snapshot", () => {
  const home = readFileSync(resolve(dist, "index.html"), "utf8");
  assert.match(home, /Энергия без привязки/);
  assert.match(home, /orbea-hero/);
  assert.ok(home.includes('<link rel="canonical" href="https://nikass.ru/"'));
  assertOpenGraph(home, "/");
  assert.equal(metaContent(home, "og:image"), `https://nikass.ru${HERO_CATEGORIES[0]!.image}`);
  const catalog = readFileSync(resolve(dist, "catalog/index.html"), "utf8");
  assert.equal(metaContent(catalog, "og:image"), `https://nikass.ru${HERO_CATEGORIES[0]!.image}`);
  const routes = [...catalog.matchAll(/href="\/catalog\/([^"/]+)"/g)].map((entry) => entry[1]).filter((slug) => slug !== "category");
  const uniqueRoutes = new Set(routes);
  assert.ok(uniqueRoutes.size > 0);
  for (const slug of uniqueRoutes) {
    assert.ok(existsSync(resolve(dist, `catalog/${slug}/index.html`)), `missing route ${slug}`);
    const page = readFileSync(resolve(dist, `catalog/${slug}/index.html`), "utf8");
    if (page.includes('<meta name="robots" content="noindex,follow"')) {
      assert.doesNotMatch(page, /<script\b[^>]*data-product-structured-data/);
      assert.doesNotMatch(page, /<script\b[^>]*data-breadcrumb-structured-data/);
      continue;
    }
    assert.ok(page.includes(`<link rel="canonical" href="https://nikass.ru/catalog/${slug}"`));
    assertOpenGraph(page, `/catalog/${slug}`);
    assertBreadcrumbList(page);
    const structuredData = jsonLd(page, "data-product-structured-data");
    const variants: Array<{ image?: string | string[]; offers?: { priceCurrency?: string } }> = structuredData["@type"] === "ProductGroup" ? structuredData.hasVariant : [structuredData];
    assert.ok(["Product", "ProductGroup"].includes(structuredData["@type"]));
    assert.equal(structuredData.brand?.name, "NIKASS");
    assert.ok(variants.every((variant) => !variant.offers || variant.offers.priceCurrency === "RUB"));
    const productImages = [structuredData.image, ...variants.map((variant) => variant.image).flat()];
    assert.ok(productImages.includes(metaContent(page, "og:image")), `OG image does not match product ${slug}`);
  }
  const sitemap = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
  const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/nikass\.ru([^<]+)<\/loc>/g)].map((entry) => entry[1]);
  for (const path of sitemapPaths) {
    const route = path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
    assertOpenGraph(readFileSync(resolve(dist, route), "utf8"), path, path.startsWith("/blog/") ? "article" : "website");
  }
  for (const category of HERO_CATEGORIES) {
    const page = readFileSync(resolve(dist, `catalog/category/${category.slug}/index.html`), "utf8");
    assert.ok(page.includes(`<title>${category.seoTitle}</title>`));
    assert.ok(page.includes(`<h1>${category.label}</h1>`));
    assert.ok(page.includes(`<meta name="description" content="${category.description}"`));
    assert.ok(page.includes(`<link rel="canonical" href="https://nikass.ru/catalog/category/${category.slug}"`));
    assert.match(page, /<article class="store-product-card"/);
    assert.equal(metaContent(page, "og:image"), `https://nikass.ru${category.image}`);
    assert.ok(sitemap.includes(`https://nikass.ru/catalog/category/${category.slug}`));
    assertBreadcrumbList(page);
  }
  for (const entry of blogEntries) {
    const page = readFileSync(resolve(dist, `blog/${entry.slug}/index.html`), "utf8");
    assertOpenGraph(page, `/blog/${entry.slug}`, "article");
    assert.equal(metaContent(page, "og:image"), `https://nikass.ru/assets/images/${entry.image}`);
    assertBreadcrumbList(page);
  }
  for (const path of ["payment-and-delivery", "return-policy", "service-center", "privacy-policy", "advertising-consent", "personal-data-consent"]) {
    const page = readFileSync(resolve(dist, `${path}/index.html`), "utf8");
    assertBreadcrumbList(page);
  }
});

test("ships related products, variant state, cart and contract-backed checkout hydration", () => {
  const slug = "invertor-avtomobilnyy-600";
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
