import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, breadcrumbStructuredData, canonicalUrl, productStructuredData, serializeJsonLd } from "../src/lib/seo";
import type { Product } from "../src/data/catalog";

const product: Product = {
  slug: "station-ns-63",
  sku: "NS-63",
  name: "Портативная зарядная станция NS-63",
  category: "Портативные зарядные станции",
  rawCategory: "Портативные зарядные станции",
  price: 45000,
  description: "Станция для дома и поездок.",
  packageContents: "",
  characteristics: "",
  image: "/assets/images/ns-63.webp",
  variants: [
    { sku: "NS-63-600", label: "600 Вт · 168 Вт·ч", price: 45000, availability: "in-stock", image: "/assets/images/ns-63-600.webp" },
    { sku: "NS-63-800", label: "800 Вт · 240 Вт·ч", price: 52000, availability: "unavailable" },
    { sku: "NS-63-PREORDER", label: "Модель под заказ", price: 1, availability: "preorder" },
  ],
};

test("canonical URLs use the production origin, omit query/hash, and remove a trailing slash", () => {
  assert.equal(
    canonicalUrl(new URL("http://localhost:4321/catalog/station-ns-63/?variant=NS-63-800#details")),
    "https://nikass.ru/catalog/station-ns-63",
  );
});

test("catalog filters canonicalize to the catalog, while category pages keep their own path", () => {
  assert.equal(
    canonicalUrl(new URL("https://nikass.ru/catalog/?category=Автомобильные%20инверторы&sort=price-asc")),
    "https://nikass.ru/catalog",
  );
  assert.equal(canonicalUrl(new URL("https://nikass.ru/catalog/?q=станция&sort=price-asc")), "https://nikass.ru/catalog");
  assert.equal(canonicalUrl(new URL("https://nikass.ru/catalog/category/powerbank/?sort=price-asc")), "https://nikass.ru/catalog/category/powerbank");
});

test("Open Graph media paths become absolute URLs and breadcrumb data follows the visible trail", () => {
  assert.equal(absoluteUrl("/assets/images/ns-63.webp"), "https://nikass.ru/assets/images/ns-63.webp");
  assert.equal(absoluteUrl("https://cdn.example.test/ns-63.webp"), "https://cdn.example.test/ns-63.webp");

  const schema = breadcrumbStructuredData([
    { name: "Главная", url: "/" },
    { name: "Каталог", url: "/catalog" },
    { name: "Портативные зарядные станции", url: "/catalog/category/portativnye-zaryadnye-stantsii" },
    { name: "Портативная зарядная станция NS-63" },
  ]);
  assert.deepEqual(schema.itemListElement.map((item) => item.position), [1, 2, 3, 4]);
  assert.equal(schema.itemListElement[2]?.item, "https://nikass.ru/catalog/category/portativnye-zaryadnye-stantsii");
  assert.equal(schema.itemListElement[3]?.name, "Портативная зарядная станция NS-63");
  assert.equal("item" in (schema.itemListElement[3] ?? {}), false);
});

test("product variant markup keeps each SKU, offer, availability, and selected-variant URL together", () => {
  const schema = productStructuredData(product) as {
    "@type": string;
    productGroupID: string;
    hasVariant: Array<Record<string, any>>;
  };

  assert.equal(schema["@type"], "ProductGroup");
  assert.equal(schema.productGroupID, "station-ns-63");
  assert.equal(schema.hasVariant.length, 3);
  assert.equal(schema.hasVariant[0]?.sku, "NS-63-600");
  assert.equal(schema.hasVariant[0]?.image, "https://nikass.ru/assets/images/ns-63-600.webp");
  assert.equal(schema.hasVariant[0]?.url, "https://nikass.ru/catalog/station-ns-63?variant=NS-63-600");
  assert.equal(schema.hasVariant[0]?.offers?.price, 45000);
  assert.equal(schema.hasVariant[0]?.offers?.priceCurrency, "RUB");
  assert.equal(schema.hasVariant[0]?.offers?.availability, "https://schema.org/InStock");
  assert.equal(schema.hasVariant[0]?.offers?.url, "https://nikass.ru/catalog/station-ns-63?variant=NS-63-600");
  assert.equal(schema.hasVariant[1]?.offers?.availability, "https://schema.org/OutOfStock");
  assert.equal("offers" in (schema.hasVariant[2] ?? {}), false);
  assert.deepEqual(schema.hasVariant[2]?.additionalProperty?.[1], { "@type": "PropertyValue", name: "Наличие", value: "Предзаказ" });
});

test("a product without variants uses Product markup and JSON-LD cannot close its script element", () => {
  const singleVariant = { ...product, variants: [product.variants[0]!] };
  const schema = productStructuredData(singleVariant) as Record<string, unknown>;
  assert.equal(schema["@type"], "Product");

  const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(serialized.includes("</script>"), false);
  assert.ok(serialized.includes("\\u003c/script>"));
});
