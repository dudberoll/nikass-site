import { detailRows, shortDescription, type Product } from "./catalog";

export const CATALOG_EDITS_KEY = "nikass.catalog-edits.v1";

export type CharacteristicRow = { label: string; value: string };
export type CatalogEdits = {
  version: 1;
  products: Record<string, {
    cardDescription?: string;
    characteristics?: Record<string, CharacteristicRow[]>;
  }>;
};

export const emptyCatalogEdits: CatalogEdits = { version: 1, products: {} };

export function defaultCardDescription(product: Product) {
  const text = shortDescription(product);
  if (text.length <= 240) return text;
  const end = text.lastIndexOf(" ", 240);
  return `${text.slice(0, end > 120 ? end : 240).trimEnd()}…`;
}

export function rowsForVariant(product: Product, sku: string, edits: CatalogEdits): CharacteristicRow[] {
  const saved = edits.products[product.slug]?.characteristics?.[sku];
  if (saved) return saved;
  return detailRows(product.variantCharacteristics?.[sku] ?? product.characteristics)
    .filter(([label, value]) => label || value)
    .map(([label, value]) => ({ label, value }));
}

export function parseCatalogEdits(value: unknown, products?: Product[]): CatalogEdits {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.products)) {
    throw new Error("Файл не похож на экспорт редактора каталога.");
  }

  const productsBySlug = products ? new Map(products.map((product) => [product.slug, product])) : undefined;
  const parsed: CatalogEdits = { version: 1, products: {} };

  for (const [slug, entry] of Object.entries(value.products)) {
    const product = productsBySlug?.get(slug);
    if ((productsBySlug && !product) || !isRecord(entry)) throw new Error(`В файле есть неизвестный товар: ${slug}.`);
    const edit: CatalogEdits["products"][string] = {};

    if (entry.cardDescription !== undefined) {
      if (typeof entry.cardDescription !== "string" || entry.cardDescription.length > 240) {
        throw new Error(`Описание товара «${product?.name ?? slug}» имеет неверный формат.`);
      }
      edit.cardDescription = entry.cardDescription;
    }

    if (entry.characteristics !== undefined) {
      if (!isRecord(entry.characteristics)) throw new Error(`Характеристики товара «${product?.name ?? slug}» имеют неверный формат.`);
      const skus = product ? new Set(product.variants.map((variant) => variant.sku)) : undefined;
      edit.characteristics = {};
      for (const [sku, rows] of Object.entries(entry.characteristics)) {
        if ((skus && !skus.has(sku)) || !Array.isArray(rows) || rows.length > 200) {
          throw new Error(`В файле есть неверный вариант товара «${product?.name ?? slug}».`);
        }
        edit.characteristics[sku] = rows.map((row) => {
          if (!isRecord(row) || typeof row.label !== "string" || typeof row.value !== "string"
            || row.label.length > 300 || row.value.length > 2_000) {
            throw new Error(`В файле есть характеристика с неверным форматом у товара «${product?.name ?? slug}».`);
          }
          return { label: row.label, value: row.value };
        });
      }
    }

    parsed.products[slug] = edit;
  }

  return parsed;
}

export function loadCatalogEdits(products?: Product[]) {
  try {
    const raw = localStorage.getItem(CATALOG_EDITS_KEY);
    return { edits: raw ? parseCatalogEdits(JSON.parse(raw), products) : emptyCatalogEdits };
  } catch {
    return {
      edits: emptyCatalogEdits,
      error: "Не удалось прочитать сохранение. Импортируйте JSON-файл или сбросьте локальные правки.",
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
