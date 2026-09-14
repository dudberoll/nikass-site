import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { blogEntries } from "../src/data/blog";

const homepage = readFileSync(fileURLToPath(new URL("../src/pages/index.astro", import.meta.url)), "utf8");
const homepageStyles = readFileSync(fileURLToPath(new URL("../src/styles/global.css", import.meta.url)), "utf8");

test("blog entries have unique links and five sentences each", () => {
  assert.equal(new Set(blogEntries.map((entry) => entry.slug)).size, blogEntries.length);
  assert.ok(blogEntries.every((entry) => entry.content.length === 5));
});

test("homepage makes stories scrollable and directions link to the blog", () => {
  assert.ok(homepage.includes("href={`/blog/${story.slug}`}"));
  assert.ok(homepage.includes("href={`/blog/${direction.slug}`}"));
  assert.ok(homepageStyles.includes("overflow-x: auto"));
  assert.ok(!homepage.includes("data-direction-index"));
});
