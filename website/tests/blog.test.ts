import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { blogEntries } from "../src/data/blog";

const homepage = readFileSync(fileURLToPath(new URL("../src/pages/index.astro", import.meta.url)), "utf8");
const articlePage = readFileSync(fileURLToPath(new URL("../src/pages/blog/[slug].astro", import.meta.url)), "utf8");
const homepageStyles = readFileSync(fileURLToPath(new URL("../src/styles/global.css", import.meta.url)), "utf8");

test("blog entries have unique links and five sentences each", () => {
  assert.equal(new Set(blogEntries.map((entry) => entry.slug)).size, blogEntries.length);
  assert.ok(blogEntries.every((entry) => entry.content.length === 5));

  const energy = blogEntries.find((entry) => entry.slug === "energy-at-dacha");
  assert.equal(energy?.hideImage, true);
  assert.ok(energy?.blocks?.some((block) => block.type === "table" && block.rows.flat().some((cell) => cell.includes("Вт·ч"))));
  assert.ok(energy?.blocks?.some((block) => block.type === "callout" && block.tone === "warning"));
  assert.ok(energy?.blocks?.filter((block) => block.type === "table").every((table) => table.rows.every((row) => row.length === table.headers.length)));
  const energyText = JSON.stringify(energy?.blocks);
  assert.ok(energyText.includes("Wh = V × Ah"));
  assert.ok(energyText.includes("Две одинаковые панели по 30 Вт"));
  assert.ok(energyText.includes("только к роутеру и ONU"));
  assert.ok(energyText.includes("теоретически около 13 часов"));
  assert.ok(energyText.includes("NS-69-500"));
  assert.ok(energyText.includes("/catalog/portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah"));
});

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
