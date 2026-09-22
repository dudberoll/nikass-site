import assert from "node:assert/strict";
import test from "node:test";

import { displayProductSku, groupCatalogProducts, mapCatalogProduct, type CatalogApiProduct } from "../src/data/catalog";

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
  const inverter = grouped.find((product) => product.name === "Автомобильный инвертор — чистая синусоида");
  const station = grouped.find((product) => product.name === "Портативная зарядная станция NS-69");

  assert.equal(inverter?.variants.length, 2);
  assert.deepEqual(inverter?.variants.map((variant) => variant.label.replace(/\s/g, "")), ["800Вт", "1300Вт"]);
  assert.equal(station?.category, "Портативные зарядные станции");
  assert.deepEqual(station?.variants.map((variant) => variant.label), ["L1 — 150 Вт", "L2 — 300 Вт", "L4 — 500 Вт"]);
  assert.equal(station?.image, "/assets/images/sl69-station.png");
  assert.match(station?.description ?? "", /LiFePO4/);
  assert.match(station?.characteristics ?? "", /NS-69-500:[\s\S]*Аккумулятор: 12,8 В \/ 42 000 мАч/);
  assert.match(station?.characteristics ?? "", /NS-69-150:[\s\S]*Ёмкость: 153,6 Вт·ч/);
  assert.match(station?.characteristics ?? "", /NS-69-500:[\s\S]*Минимальное время зарядки от солнечного входа 200 Вт: ≈2 ч 41 мин/);
  assert.match(station?.characteristics ?? "", /NS-69-500:[\s\S]*Вес: 4,5 кг/);
  assert.match(station?.characteristics ?? "", /Общее количество выходов: 10/);
});

test("labels powerbank categories and model cards in English", () => {
  const grouped = groupCatalogProducts([
    source("vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy", "Внешний аккумулятор 20 000 mAh", "power-bank", { Емкость: "20 000 мАч" }, "PB-20", 1_000),
    source("vneshniy-akkumulyator-50000-mah-s-bystroy-zaryadkoy", "Внешний аккумулятор 50 000 mAh", "power-bank", { Емкость: "50 000 мАч" }, "PB-50", 2_000),
  ]);

  const powerbank = grouped[0];
  assert.equal(powerbank?.category, "POWERBANK");
  assert.equal(powerbank?.name, "POWERBANK");
  assert.deepEqual(powerbank?.variants.map((variant) => variant.label.replace(/\s/g, "")), ["20000мАч", "50000мАч"]);
});

test("keeps NS-31 characteristics per selected variant", () => {
  const station = groupCatalogProducts([
    source("portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2", "Портативная зарядная станция SL-31 150 Вт", "portativnye-stantsii", {}, "NS-31-150", 10_000),
    source("portativnaya-zaryadnaya-stantsiya-300-vt-96000-mah", "Портативная зарядная станция SL-31 300 Вт", "portativnye-stantsii", {}, "NS-31-300", 15_000),
  ])[0];

  assert.deepEqual(station?.variants.map((variant) => variant.label.replace(/\u00a0/g, " ")), [
    "150 Вт · 48 000 мАч · 153,6 Вт·ч",
    "300 Вт · 96 000 мАч · 307,2 Вт·ч",
  ]);
  assert.equal(station?.image, "/assets/images/sl31-station.png");
  assert.match(station?.variantCharacteristics?.["NS-31-150"] ?? "", /Размеры: 230 × 130 × 220 мм/);
  assert.match(station?.variantCharacteristics?.["NS-31-300"] ?? "", /Защита: IP21/);
  assert.doesNotMatch(station?.variantCharacteristics?.["NS-31-150"] ?? "", /IP21/);
});

test("shows NS station labels while preserving the provider SKU", () => {
  const product = source(
    "portativnaya-zaryadnaya-stantsiya-sl-54-s-radio-i-bluetooth-150-vt-153-6-vt-ch",
    "Портативная зарядная станция SL-54",
    "portativnye-stantsii",
    {},
    "SL-54",
    10_000,
  );

  assert.equal(product.name, "Портативная зарядная станция NS-54");
  assert.equal(product.sku, "SL-54");
  assert.equal(displayProductSku(product), "NS-54");
  assert.match(product.characteristics, /Артикул: NS-54/);
  assert.equal(product.variants[0]?.sku, "SL-54");
});
