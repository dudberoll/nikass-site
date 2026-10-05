import assert from "node:assert/strict";
import test from "node:test";

import { detailRows, displayProductSku, groupCatalogProducts, mapCatalogProduct, type CatalogApiProduct } from "../src/data/catalog";
import { emptyCatalogEdits, rowsForVariant } from "../src/data/catalog-editor";

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

test("uses WooCommerce specifications without a local SKU override or splitting semicolons", () => {
  const product = source("inverter", "Инвертор", "invertory", {
    Мощность: "777 Вт", "Выходы": "5 В / 2 А; 9 В / 2 А",
  }, "WJF-800GST", 1234);
  assert.deepEqual(detailRows(product.characteristics), [
    ["Артикул", "WJF-800GST"], ["Мощность", "777 Вт"], ["Выходы", "5 В / 2 А; 9 В / 2 А"],
  ]);
});

test("keeps WooCommerce image, kit and warranty for each model in a grouped card", () => {
  const products = [150, 300].map((power) => mapCatalogProduct({
    slug: power === 150 ? "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2" : "portativnaya-zaryadnaya-stantsiya-300-vt-96000-mah",
    name: `Станция ${power} Вт`, category: "portativnye-stantsii", images: [`https://cdn.example.com/ns31-${power}.png`],
    shortDescription: "", description: `Описание ${power}`, characteristics: { Мощность: `${power} Вт` },
    packageContents: [`Комплект ${power}`], warranty: `${power} дней`,
    variants: [{ sku: `NS-31-${power}`, label: "Основной вариант", price: power, availability: "in-stock" }],
  }));
  const grouped = groupCatalogProducts(products)[0];
  assert.deepEqual(grouped.variants.map((variant) => variant.image), [
    "https://cdn.example.com/ns31-150.png", "https://cdn.example.com/ns31-300.png",
  ]);
  assert.deepEqual(grouped.variantPackageContents, { "NS-31-150": "Комплект 150", "NS-31-300": "Комплект 300" });
  assert.deepEqual(grouped.variantWarranties, { "NS-31-150": "150 дней", "NS-31-300": "300 дней" });
  const exportRows = rowsForVariant(grouped, "NS-31-300", emptyCatalogEdits);
  assert.ok(exportRows.some((row) => row.label === "Комплектация" && row.value === "Комплект 300"));
  assert.ok(exportRows.some((row) => row.label === "Гарантия" && row.value === "300 дней"));
});

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
  assert.equal(station?.image, "/assets/images/gear-menu.webp");
  assert.equal(station?.description, "");
  assert.match(station?.characteristics ?? "", /NS-69-150:[\s\S]*Мощность: 150/);
  assert.match(station?.variantCharacteristics?.["NS-69-500"] ?? "", /Емкость: 168000/);
  assert.doesNotMatch(station?.characteristics ?? "", /Минимальное время зарядки|Общее количество выходов/);
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
    source("portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2", "Портативная зарядная станция SL-31 150 Вт", "portativnye-stantsii", { Ёмкость: "153,6 Вт·ч", "Эквивалентная ёмкость": "48 000 мАч", Размеры: "230 × 130 × 220 мм" }, "NS-31-150", 10_000),
    source("portativnaya-zaryadnaya-stantsiya-300-vt-96000-mah", "Портативная зарядная станция SL-31 300 Вт", "portativnye-stantsii", { Ёмкость: "307,2 Вт·ч", "Эквивалентная ёмкость": "96 000 мАч", Размеры: "230 × 135 × 220 мм", Защита: "IP21" }, "NS-31-300", 15_000),
  ])[0];

  assert.deepEqual(station?.variants.map((variant) => variant.label.replace(/\u00a0/g, " ")), [
    "150 Вт · 48 000 мАч · 153,6 Вт·ч",
    "300 Вт · 96 000 мАч · 307,2 Вт·ч",
  ]);
  assert.equal(station?.image, "/assets/images/gear-menu.webp");
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
