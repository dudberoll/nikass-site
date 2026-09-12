import csv from "./nikass_catalog_ozon.csv?raw";

export type Product = {
  slug: string;
  sku: string;
  name: string;
  category: string;
  rawCategory: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  description: string;
  packageContents: string;
  characteristics: string;
  image: string;
  variants: ProductVariant[];
};

export type Availability = "in-stock" | "preorder" | "unavailable";

export type ProductVariant = {
  sku: string;
  label: string;
  price: number;
  oldPrice?: number;
  availability: Availability;
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  "in-stock": "В наличии",
  preorder: "Предзаказ",
  unavailable: "Недоступен",
};

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ";" && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
}

const rows = parseCsv(csv);
const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "").trim()) ?? [];

function value(row: string[], name: string) {
  return row[headers.indexOf(name)]?.trim() ?? "";
}

function numberValue(raw: string) {
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function categoryFor(raw: string, name: string) {
  const source = `${raw} ${name}`;
  if (/инвертор/i.test(source)) return "Инверторы";
  if (/солнечн/i.test(source)) return "Солнечные панели";
  if (/PowerBank|внешний аккумулятор/i.test(name)) return "Power Bank";
  if (/резервный источник|зарядн/i.test(name)) return "Зарядные станции";
  if (/AGM|аккумулятор/i.test(name) || /ИБП/i.test(raw)) return "AGM-аккумуляторы";
  return "Энергетика";
}

function availabilityFor(raw: string): Availability {
  const normalized = raw.trim().toLocaleLowerCase("ru-RU");
  if (["preorder", "предзаказ"].includes(normalized)) return "preorder";
  if (["unavailable", "недоступен", "нет в наличии"].includes(normalized)) return "unavailable";
  return "in-stock";
}

export const products: Product[] = rows.map((row) => {
  const sku = value(row, "Артикул");
  const rawCategory = value(row, "Категория");
  const name = value(row, "Название");

  const price = numberValue(value(row, "Цена_руб")) ?? 0;
  const oldPrice = numberValue(value(row, "Старая_цена_руб"));
  const availability = availabilityFor(value(row, "Наличие"));

  return {
    slug: sku,
    sku,
    name,
    category: categoryFor(rawCategory, name),
    rawCategory,
    price,
    oldPrice,
    discount: numberValue(value(row, "Скидка_проц")),
    description: value(row, "Описание"),
    packageContents: value(row, "Комплектация"),
    characteristics: value(row, "Характеристики"),
    image: `/products/${sku}.webp`,
    variants: [{ sku, label: "Основной вариант", price, oldPrice, availability }],
  };
});

export const categories = [...new Set(products.map((product) => product.category))];

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

export function shortDescription(product: Product) {
  return product.description.split(/\r?\n/).find(Boolean) ?? "Надёжное решение для автономного питания.";
}

export function detailLines(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function detailRows(value: string): Array<[string, string]> {
  const lines = detailLines(value).filter((line) => line !== "Добавить к сравнению");
  const rows: Array<[string, string]> = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const separator = line.indexOf(":");

    if (separator > 0) {
      rows.push([line.slice(0, separator).trim(), line.slice(separator + 1).trim()]);
      index += 1;
      continue;
    }

    rows.push([line, lines[index + 1] ?? ""]);
    index += 2;
  }

  return rows;
}

export function getSelectedVariant(product: Product, sku?: string) {
  return product.variants.find((variant) => variant.sku === sku) ?? product.variants[0];
}

export function isVariantAddable(variant: ProductVariant) {
  return variant.availability !== "unavailable";
}

export function relatedProducts(product: Product, limit = 4) {
  return products.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, limit);
}
