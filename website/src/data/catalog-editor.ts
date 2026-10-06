import { detailRows, shortDescription, type Availability, type Product } from "./catalog";

export const CATALOG_EDITS_KEY = "nikass.catalog-edits.v2";
const LEGACY_CATALOG_EDITS_KEY = "nikass.catalog-edits.v1";
export const ESS_CATEGORY = "Системы хранения энергии ESS";

export type CharacteristicRow = { label: string; value: string };
export type DraftVariant = {
  id: string;
  sku: string;
  label: string;
  price: number | null;
  oldPrice: number | null;
  availability: Availability | null;
  characteristics: CharacteristicRow[];
};
export type DraftProduct = {
  id: string;
  category: typeof ESS_CATEGORY;
  name: string;
  cardDescription: string;
  description: string;
  image: string;
  packageContents: string;
  variants: DraftVariant[];
};
export type CatalogEdits = {
  version: 2;
  products: Record<string, {
    cardDescription?: string;
    characteristics?: Record<string, CharacteristicRow[]>;
  }>;
  newProducts: DraftProduct[];
};

export const emptyCatalogEdits: CatalogEdits = { version: 2, products: {}, newProducts: [] };

export function createEssDraftProduct(id: string): DraftProduct {
  return {
    id,
    category: ESS_CATEGORY,
    name: "",
    cardDescription: "",
    description: "",
    image: "",
    packageContents: "",
    variants: [{ id: `${id}-variant-1`, sku: "", label: "", price: null, oldPrice: null, availability: null, characteristics: [] }],
  };
}

export function createDraftVariant(id: string): DraftVariant {
  return { id, sku: "", label: "", price: null, oldPrice: null, availability: null, characteristics: [] };
}

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
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isRecord(value.products)) {
    throw new Error("Файл не похож на экспорт редактора каталога.");
  }

  const productsBySlug = products ? new Map(products.map((product) => [product.slug, product])) : undefined;
  const parsed: CatalogEdits = { version: 2, products: {}, newProducts: [] };

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
        edit.characteristics[sku] = rows.map((row) => parseCharacteristic(row, `В файле есть характеристика с неверным форматом у товара «${product?.name ?? slug}».`));
      }
    }

    parsed.products[slug] = edit;
  }

  if (value.newProducts !== undefined) {
    if (!Array.isArray(value.newProducts) || value.newProducts.length > 100) {
      throw new Error("В файле слишком много новых карточек или неверный формат списка.");
    }
    const ids = new Set<string>();
    const skus = new Set((products ?? []).flatMap((product) => product.variants.map((variant) => variant.sku.trim().toLocaleLowerCase("en"))).filter(Boolean));
    parsed.newProducts = value.newProducts.map((entry) => {
      if (!isRecord(entry) || typeof entry.id !== "string" || !/^[\w-]{1,100}$/.test(entry.id)
        || typeof entry.category !== "string" || entry.category !== ESS_CATEGORY
        || typeof entry.name !== "string" || entry.name.length > 300
        || typeof entry.cardDescription !== "string" || entry.cardDescription.length > 240
        || typeof entry.description !== "string" || entry.description.length > 5_000
        || typeof entry.image !== "string" || entry.image.length > 2_000
        || (entry.image !== "" && !(entry.image.startsWith("/") && !entry.image.startsWith("//")) && !/^https?:\/\//i.test(entry.image))
        || typeof entry.packageContents !== "string" || entry.packageContents.length > 5_000
        || !Array.isArray(entry.variants) || entry.variants.length < 1 || entry.variants.length > 50) {
        throw new Error("В файле есть новая ESS-карточка с неверным форматом.");
      }
      if (ids.has(entry.id)) throw new Error("В файле есть повторяющийся идентификатор карточки.");
      ids.add(entry.id);

      const variantIds = new Set<string>();
      const variants = entry.variants.map((variant) => {
        if (!isRecord(variant) || typeof variant.id !== "string" || !/^[\w-]{1,120}$/.test(variant.id)
          || typeof variant.sku !== "string" || variant.sku.length > 120
          || typeof variant.label !== "string" || variant.label.length > 240
          || !isPrice(variant.price) || !isPrice(variant.oldPrice)
          || !(variant.availability === null || ["in-stock", "preorder", "unavailable"].includes(String(variant.availability)))
          || !Array.isArray(variant.characteristics) || variant.characteristics.length > 200) {
          throw new Error(`В файле есть вариант с неверным форматом у товара «${entry.name || entry.id}».`);
        }
        if (variantIds.has(variant.id)) throw new Error(`У товара «${entry.name || entry.id}» повторяется идентификатор варианта.`);
        variantIds.add(variant.id);
        const sku = variant.sku.trim().toLocaleLowerCase("en");
        if (sku && skus.has(sku)) throw new Error(`Артикул «${variant.sku}» повторяется или уже есть в каталоге.`);
        if (sku) skus.add(sku);
        return {
          id: variant.id,
          sku: variant.sku,
          label: variant.label,
          price: variant.price,
          oldPrice: variant.oldPrice,
          availability: variant.availability as Availability | null,
          characteristics: variant.characteristics.map((row) => parseCharacteristic(row)),
        };
      });
      return {
        id: entry.id,
        category: ESS_CATEGORY,
        name: entry.name,
        cardDescription: entry.cardDescription,
        description: entry.description,
        image: entry.image,
        packageContents: entry.packageContents,
        variants,
      };
    });
  }

  return parsed;
}

export function loadCatalogEdits(products?: Product[]) {
  try {
    const raw = localStorage.getItem(CATALOG_EDITS_KEY) ?? localStorage.getItem(LEGACY_CATALOG_EDITS_KEY);
    return { edits: raw ? parseCatalogEdits(JSON.parse(raw), products) : emptyCatalogEdits };
  } catch {
    return {
      edits: emptyCatalogEdits,
      error: "Не удалось прочитать сохранение. Импортируйте JSON-файл или сбросьте локальные правки.",
    };
  }
}

function parseCharacteristic(row: unknown, errorMessage = "В файле есть характеристика с неверным форматом."): CharacteristicRow {
  if (!isRecord(row) || typeof row.label !== "string" || typeof row.value !== "string"
    || row.label.length > 300 || row.value.length > 2_000) {
    throw new Error(errorMessage);
  }
  return { label: row.label, value: row.value };
}

function isPrice(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
