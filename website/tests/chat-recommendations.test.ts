import assert from "node:assert/strict";
import test from "node:test";

import { extractCatalogProductSlugs, removeCatalogProductLinkLines } from "../src/components/AiComponentsDemo";

test("extracts unique catalog links and leaves normal reply text", () => {
  const reply = "Вот подходящий вариант:\n\n- [SL69](/catalog/sl69)\n- [SL69 ещё раз](https://nikass.ru/catalog/sl69)\n- [Пауэрбанк](/catalog/power-bank)";

  assert.deepEqual(extractCatalogProductSlugs(reply), ["sl69", "power-bank"]);
  assert.equal(removeCatalogProductLinkLines(reply), "Вот подходящий вариант:");
});
