import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogExplorer from "../src/components/CatalogExplorer";
import { HERO_CATEGORIES, getCatalogCategoryPath, type Product } from "../src/data/catalog";

const products: Product[] = [{
  slug: "station",
  sku: "STATION",
  name: "Портативная зарядная станция",
  category: "Портативные зарядные станции",
  rawCategory: "charging-stations",
  price: 10000,
  description: "Станция для дома и поездок.",
  packageContents: "",
  characteristics: "",
  image: "/station.webp",
  variants: [{ sku: "STATION", label: "Основная модель", price: 10000, availability: "in-stock" }],
}];

test("every public catalog category has a unique page and useful SEO text", () => {
  const paths = HERO_CATEGORIES.map(({ category }) => getCatalogCategoryPath(category));

  assert.equal(HERO_CATEGORIES.length, 8);
  assert.equal(new Set(paths).size, HERO_CATEGORIES.length);
  assert.ok(paths.every((path) => path?.startsWith("/catalog/category/")));
  assert.ok(HERO_CATEGORIES.every(({ seoTitle, description }) => seoTitle.length > 20 && description.length > 80));
  assert.equal(getCatalogCategoryPath("нет такой категории"), undefined);
});

test("catalog category navigation links directly to standalone pages", () => {
  const markup = renderToStaticMarkup(<CatalogExplorer products={products} categories={HERO_CATEGORIES} />);

  assert.match(markup, /href="\/catalog\/category\/portativnye-zaryadnye-stantsii"[^>]*>Портативные зарядные станции<\/a>/);
  assert.doesNotMatch(markup, /href="\/catalog\?category=/);
});

test("a category page renders its selected products before browser hydration", () => {
  const category = HERO_CATEGORIES.find(({ category }) => category === products[0]?.category)!;
  const markup = renderToStaticMarkup(
    <CatalogExplorer products={products} categories={HERO_CATEGORIES} initialCategory={category.category} />,
  );

  assert.match(markup, /Портативная зарядная станция/);
  assert.match(markup, /class="catalog-guide"/);
});
