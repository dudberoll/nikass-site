import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const homepage = readFileSync(fileURLToPath(new URL("../src/pages/index.astro", import.meta.url)), "utf8");
const articlePage = readFileSync(fileURLToPath(new URL("../src/pages/blog/[slug].astro", import.meta.url)), "utf8");
const homepageStyles = readFileSync(fileURLToPath(new URL("../src/styles/global.css", import.meta.url)), "utf8");

test("homepage makes stories scrollable", () => {
  assert.ok(homepage.includes("href={`/blog/${story.slug}`}"));
  assert.ok(homepageStyles.includes("overflow-x: auto"));
});

test("energy article recommends a station and a solar panel in bestseller cards", () => {
  assert.ok(articlePage.includes("Рекомендуемые товары"));
  assert.ok(articlePage.includes("orbea-bestseller-card"));
  assert.ok(articlePage.includes("Портативные зарядные станции"));
  assert.ok(articlePage.includes("Солнечные панели"));
  assert.ok(homepageStyles.includes(".blog-recommended-products .orbea-bestsellers-grid"));
});

test("new SEO articles have separate pages, metadata and no visible photos", async () => {
  const { seoEntries, blogEntries } = await import("../src/data/blog");
  assert.equal(seoEntries.length, 10);
  assert.equal(new Set(blogEntries.map((entry) => entry.slug)).size, blogEntries.length);
  for (const entry of seoEntries) {
    assert.ok(blogEntries.includes(entry));
    assert.ok(entry.seoTitle && entry.summary && entry.blocks?.length);
    assert.ok(entry.hideImage && entry.hideCardImage);
    assert.ok(entry.blocks.some((block) => block.type === "links"));
  }
});
