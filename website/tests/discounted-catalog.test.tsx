import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogExplorer from "../src/components/CatalogExplorer";
import ProductVariantSelector from "../src/components/ProductVariantSelector";
import ProductCard from "../src/components/ProductCard";
import { createDemoDiscountedProducts, getProductPrice, HERO_CATEGORIES, relatedProducts, selectCatalogProducts, type CatalogApiProduct } from "../src/data/catalog";
import { addCartItem } from "../src/lib/cart";

const regular: CatalogApiProduct = {
  slug: "station", name: "Станция", category: "charging-stations", images: [],
  shortDescription: "", description: "", characteristics: {}, packageContents: [],
  variants: [{ sku: "STATION", label: "Основной вариант", price: 10000, availability: "in-stock" }],
};
const discounted: CatalogApiProduct = {
  ...regular, slug: "station-outlet-1", name: "Станция с царапиной", discounted: true,
  images: ["https://cdn.example.com/station.jpg", "https://cdn.example.com/defect.jpg"],
  characteristics: { Дефекты: "Царапина на корпусе" },
  variants: [{ sku: "STATION-OUTLET-1", label: "Основной вариант", price: 8000, oldPrice: 10000, availability: "in-stock" }],
};

test("preorder prices are pending in cards and variant details", () => {
  const product = selectCatalogProducts([{ ...regular, variants: [
    { sku: "WAIT", label: "Ожидается", price: 100, oldPrice: 200, availability: "preorder" },
  ] }], { station: [] })[0]!;
  for (const markup of [
    renderToStaticMarkup(<CatalogExplorer products={[product]} categories={HERO_CATEGORIES} />),
    renderToStaticMarkup(<ProductVariantSelector product={product} />),
    renderToStaticMarkup(<ProductCard product={product} appearance="bestseller" />),
  ]) {
    assert.match(markup, /Цена уточняется/);
    assert.doesNotMatch(markup, /100 ₽|200 ₽|<del>/);
  }
  product.variants.push(
    { sku: "LARGE", label: "Большой", price: 20000, availability: "in-stock" },
    { sku: "READY", label: "Есть", price: 10000, availability: "in-stock" },
  );
  assert.equal(getProductPrice(product).label, "от 10\u00a0000 ₽");
  const mixed = renderToStaticMarkup(<CatalogExplorer products={[product]} categories={HERO_CATEGORIES} />);
  assert.match(mixed, /от 10\s000 ₽/);
  assert.doesNotMatch(mixed, /от 100 ₽|200 ₽|<del>/);
  assert.equal(getProductPrice(product, "WAIT").label, "Цена уточняется");
  assert.equal(getProductPrice(product, "READY").label, "10\u00a0000 ₽");
});

test("includes separate discounted stock outside the regular allow-list and preserves a mixed cart", () => {
  const products = selectCatalogProducts([regular, discounted, { ...regular, slug: "legacy" }], { station: [] });
  assert.deepEqual(products.map(({ slug }) => slug), ["station", "station-outlet-1"]);
  assert.equal(products[1]?.defectDescription, "Царапина на корпусе");
  assert.deepEqual(products[1]?.images, discounted.images);
  assert.deepEqual(relatedProducts(products[0]!, products), []);
  const cart = products.reduce((items, product) => addCartItem(items, product, product.variants[0]!.sku), [] as ReturnType<typeof addCartItem>);
  assert.deepEqual(cart.map(({ productSlug, variantSku }) => [productSlug, variantSku]), [["station", "STATION"], ["station-outlet-1", "STATION-OUTLET-1"]]);
  const markup = renderToStaticMarkup(<CatalogExplorer products={[products[1]!]} categories={HERO_CATEGORIES} discounted />);
  assert.doesNotMatch(markup, /aria-label="Категории товаров"/);
  assert.doesNotMatch(markup, /href="\/discounted"/);
  const regularMarkup = renderToStaticMarkup(<CatalogExplorer products={[products[0]!]} categories={HERO_CATEGORIES} />);
  assert.match(regularMarkup, />Все товары<\/button>/);
  assert.match(regularMarkup, /href="\/discounted">Уценённые товары<\/a>/);
  assert.match(markup, /<del>10\s000 ₽<\/del>/);
  assert.match(markup, /8\s000 ₽/);
});

test("empty discounted catalog explains that offers have not been added yet", () => {
  const markup = renderToStaticMarkup(<CatalogExplorer products={[]} categories={HERO_CATEGORIES} discounted />);
  assert.match(markup, /Уценённых товаров пока нет/);
  assert.match(markup, /Поиск по каталогу/);
  assert.match(markup, /Сортировка товаров/);
});

test("creates one independent demo variant per regular card in every category without changing originals", () => {
  const originals = HERO_CATEGORIES.map(({ category }, index) => ({
    ...selectCatalogProducts([regular], { station: [] })[0]!, slug: `model-${index}`, category,
    variants: [
      { sku: `OFF-${index}`, label: "Недоступный", price: 12000, availability: "unavailable" as const },
      { sku: `ON-${index}`, image: `https://cdn.example.com/selected-${index}.png`, sourceSlug: `source-${index}`, label: "300 Вт", price: 10000, availability: "in-stock" as const },
    ],
    variantCharacteristics: { [`ON-${index}`]: "Мощность: 300 Вт" },
  }));
  const before = structuredClone(originals);
  const demos = createDemoDiscountedProducts(originals);
  assert.equal(demos.length, HERO_CATEGORIES.length);
  assert.deepEqual(demos.map(({ category }) => category), HERO_CATEGORIES.map(({ category }) => category));
  for (const [index, demo] of demos.entries()) {
    assert.equal(demo.demo, true);
    assert.equal(demo.discounted, true);
    assert.equal(demo.variants.length, 1);
    assert.equal(demo.variants[0]?.label, "300 Вт");
    assert.equal(demo.variants[0]?.price, 8000);
    assert.equal(demo.variants[0]?.oldPrice, 10000);
    assert.equal(demo.variants[0]?.sourceSlug, demo.slug);
    assert.notEqual(demo.variants[0]?.sku, originals[index]?.variants[1]?.sku);
    assert.equal(demo.characteristics, "Мощность: 300 Вт");
    assert.equal(demo.image, originals[index]?.variants[1]?.image);
    assert.deepEqual(demo.images, [demo.image]);
    const cart = addCartItem(addCartItem([], originals[index]!, `ON-${index}`), demo, demo.sku);
    assert.equal(cart.length, 2);
    assert.equal(cart[1]?.productSlug, demo.slug);
  }
  assert.deepEqual(originals, before);
  assert.deepEqual(createDemoDiscountedProducts(demos), []);
});
