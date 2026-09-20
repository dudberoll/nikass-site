import assert from "node:assert/strict";
import test from "node:test";

import { groupCatalogProducts, mapCatalogProduct, type CatalogApiProduct } from "../src/data/catalog";

function source(slug: string, name: string, category: string, characteristics: Record<string, string>, sku: string, price: number) {
  const product: CatalogApiProduct = {
    slug,
    name,
    category,
    images: [],
    shortDescription: "",
    description: "",
    characteristics,
    packageContents: [],
    variants: [{ sku, label: "Основной вариант", price, availability: "in-stock" }],
  };
  return mapCatalogProduct(product);
}

test("groups model families, keeps compact stations separate, and deduplicates equal options", () => {
  const products = [
    source("invertor-avtomobilnyy-800", "Автомобильный инвертор 800 Вт / 1.600 Вт, чистая синусоида", "invertory", { Мощность: "800 Вт" }, "INV-800", 4_260),
    source("invertor-avtomobilnyy-1300", "Автомобильный инвертор 1.300 Вт / 2.600 Вт, чистая синусоида", "invertory", { Мощность: "1300 Вт" }, "INV-1300", 5_850),
    source("portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah", "Портативная зарядная станция SL-69-L1 150 Вт 153 Вт·ч", "portativnye-stantsii", { Мощность: "150", Емкость: "48000" }, "NS-69-150", 10_080),
    source("portativnaya-zaryadnaya-stantsiya-300-w-72000-mah", "Портативная зарядная станция SL-69-L2 300 Вт 230 Вт·ч", "portativnye-stantsii", { Мощность: "300", Емкость: "72000" }, "NS-69-300", 12_000),
    source("portativnaya-zaryadnaya-stantsiya-500w-160000mah", "Портативная зарядная станция SL-69-L4 500 Вт 537 Вт·ч", "portativnye-stantsii", { Мощность: "500", Емкость: "168000" }, "NS-69-500", 36_320),
  ];

  const grouped = groupCatalogProducts(products);
  const inverter = grouped.find((product) => product.name === "NIKASS Автомобильный инвертор — чистая синусоида");
  const station = grouped.find((product) => product.name === "Портативная зарядная станция SL-69");

  assert.equal(inverter?.variants.length, 2);
  assert.deepEqual(inverter?.variants.map((variant) => variant.label.replace(/\s/g, "")), ["800Вт", "1300Вт"]);
  assert.equal(station?.category, "Портативные зарядные станции");
  assert.deepEqual(station?.variants.map((variant) => variant.label), ["L1 — 150 Вт", "L2 — 300 Вт", "L4 — 500 Вт"]);
  assert.equal(station?.image, "/assets/images/sl69-station.png");
  assert.match(station?.description ?? "", /LiFePO4/);
  assert.match(station?.characteristics ?? "", /Аккумулятор L4: 12,8 В \/ 42 000 мА·ч/);
  assert.match(station?.characteristics ?? "", /Расчётная ёмкость L1: ≈153,6 Вт·ч/);
  assert.match(station?.characteristics ?? "", /Расчётное минимальное время зарядки L4 от солнечного входа 200 Вт: ≈2 ч 41 мин/);
  assert.match(station?.characteristics ?? "", /Вес L4: 4,5 кг/);
  assert.match(station?.characteristics ?? "", /Количество выходных разъёмов: 10/);
});
