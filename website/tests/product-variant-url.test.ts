import assert from "node:assert/strict";
import test from "node:test";

import { productVariantPath, selectedVariantSku } from "../src/lib/product-variant-url";

const product = {
  slug: "product",
  variants: [
    { sku: "NS/APS1200-12" },
    { sku: "NS~2FAPS1200-12" },
  ],
} as const;

test("variant URLs use a safe, distinct path even for SKUs containing slashes", () => {
  assert.equal(productVariantPath(product, "NS/APS1200-12"), "/catalog/product/sku-NS~2FAPS1200-12");
  assert.equal(productVariantPath(product, "NS~2FAPS1200-12"), "/catalog/product/sku-NS~7E2FAPS1200-12");
});

test("selected variant comes from the path or an existing query link", () => {
  const selected = (path: string) => selectedVariantSku(new URL(path, "https://nikass.ru"), product);
  assert.equal(selected("/catalog/product/sku-NS~7E2FAPS1200-12/?variant=NS%2FAPS1200-12"), "NS~2FAPS1200-12");
  assert.equal(selected("/catalog/product?variant=NS~2FAPS1200-12"), "NS~2FAPS1200-12");
  assert.equal(selected("/catalog/product?variant=unknown"), "NS/APS1200-12");
  assert.equal(selected("/catalog/product"), "NS/APS1200-12");
});
