import assert from "node:assert/strict";
import test from "node:test";

import { productVariantUrl, selectedVariantSku } from "../src/lib/product-variant-url";

test("variant URLs preserve other location state and encode the selected SKU", () => {
  assert.equal(
    productVariantUrl("https://nikass.ru/catalog/product?campaign=spring#details", "NS/APS1200-12"),
    "/catalog/product?campaign=spring&variant=NS%2FAPS1200-12#details",
  );
});

test("selected variant comes from the URL when it belongs to the product", () => {
  const variants = [{ sku: "NS-31-150" }, { sku: "NS-31-300" }];

  assert.equal(selectedVariantSku("?variant=NS-31-300", variants), "NS-31-300");
  assert.equal(selectedVariantSku("?variant=unknown", variants), "NS-31-150");
  assert.equal(selectedVariantSku("", variants), "NS-31-150");
});
