export type Product = {
  slug: string;
  sku: string;
  name: string;
  category: string;
  rawCategory: string;
  price: number;
  oldPrice?: number;
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

export type CatalogApiProduct = {
  slug: string;
  name: string;
  category: string;
  images: string[];
  shortDescription: string;
  description: string;
  characteristics: Record<string, string>;
  packageContents: string[];
  variants: Array<{
    sku: string;
    label: string;
    price: number;
    oldPrice?: number;
    availability: Availability;
  }>;
};

type CatalogApiResponse = {
  items: CatalogApiProduct[];
};

type CatalogSelection = Record<string, readonly string[]>;

// The CSV contains 24 marketplace listings for 21 unique WooCommerce products.
// Product data still comes only from the API; this map limits the storefront to that CSV selection.
const catalogArticlesBySlug: CatalogSelection = {
  "invertor-avtomobilnyy-1200": ["3204442838"],
  "komplekt-portativnaya-solnechnaya-panel-30w-18v-2-sht": ["2132358808"],
  "portativnaya-solnechnaya-panel-30w-18-v": ["1755717935", "1924633330"],
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-70ah-12v": ["3541653896"],
  "invertor-avtomobilnyy-1600": ["3204445652"],
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-200ah-12v": ["3541647028"],
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-65ah-12v": ["3541650732"],
  "invertor-avtomobilnyy-600": ["3204436759"],
  "nikass-portativnaya-solnechnaya-panel-60-vt-1-87-kg": ["2132347841"],
  "portativnaya-zaryadnaya-stantsiya-300-w-72000-mah": ["1755810943", "1896479346"],
  "gibkaya-solnechnaya-panel-30w-18v": ["2451550083"],
  "solnechnaya-panel-30-vt-dlya-elektropastuha": ["5539264041"],
  "vneshniy-akkumulyator-50000-mah-s-bystroy-zaryadkoy": ["3491056653"],
  "portativnaya-zaryadnaya-stantsiya-300vt-64000-mah-205wh": ["1755723032", "2365402536"],
  "nikass-portativnaya-solnechnaya-panel-60-vt-700-g": ["5370712388"],
  "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah": ["1755807862"],
  "invertor-avtomobilnyy-2300": ["3204449436"],
  "vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy": ["3491023348"],
  "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh": ["1896136316"],
  "rezervnyy-istochnik-pitaniya-500-vt-537-vtch-168000-mah": ["1896489414"],
  "portativnaya-zaryadnaya-stantsiya-500w-160000mah": ["1755808721"],
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  "in-stock": "В наличии",
  preorder: "Предзаказ",
  unavailable: "Недоступен",
};

const apiBase = (import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
let catalogPromise: Promise<Product[]> | undefined;

export async function loadCatalogProducts() {
  catalogPromise ??= fetch(`${apiBase}/api/catalog?perPage=100&sort=popularity`, {
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`WooCommerce catalog request failed: ${response.status}`);
    const payload = await response.json() as CatalogApiResponse;
    if (!payload || !Array.isArray(payload.items)) throw new Error("WooCommerce catalog response is invalid");
    return selectCatalogProducts(payload.items);
  }).catch((error) => {
    // Allow a later retry when the API was still starting during static/dev boot.
    catalogPromise = undefined;
    throw error;
  });

  return catalogPromise;
}

export function selectCatalogProducts(
  products: CatalogApiProduct[],
  selection: CatalogSelection = catalogArticlesBySlug,
) {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const missing = Object.keys(selection).filter((slug) => !productsBySlug.has(slug));
  if (missing.length > 0) throw new Error(`WooCommerce catalog is missing selected products: ${missing.join(", ")}`);

  return Object.entries(selection).map(([slug, articles]) => mapCatalogProduct(productsBySlug.get(slug)!, articles));
}

export function mapCatalogProduct(product: CatalogApiProduct, articles: readonly string[] = []): Product {
  const variants = product.variants.map((variant) => ({ ...variant }));
  const primary = variants[0];
  if (!primary) throw new Error(`WooCommerce product ${product.slug} has no variants`);
  const article = articles[0] ?? primary.sku;
  const characteristics = {
    "Артикул": article,
    ...(articles.length > 1 ? { "Дополнительные артикулы": articles.slice(1).join(", ") } : {}),
    ...Object.fromEntries(Object.entries(product.characteristics).filter(([label]) => label !== "Артикул")),
  };

  return {
    slug: product.slug,
    sku: article,
    name: product.name,
    category: categoryLabel(product.category),
    rawCategory: product.category,
    price: primary.price,
    ...(primary.oldPrice !== undefined ? { oldPrice: primary.oldPrice } : {}),
    description: stripHtml(product.description || product.shortDescription),
    packageContents: product.packageContents.join("\n"),
    characteristics: Object.entries(characteristics)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n"),
    image: product.images[0] ?? "/assets/images/gear-menu.webp",
    variants,
  };
}

function categoryLabel(value: string) {
  const labels: Record<string, string> = {
    "akkumulyatory": "Аккумуляторы",
    "charging-stations": "Зарядные станции",
    "invertory": "Инверторы",
    "portativnye-stantsii": "Портативные станции",
    "power-bank": "Power Bank",
    "solnechnye-paneli": "Солнечные панели",
    "zaryadnye-stantsii": "Зарядные станции",
  };
  return labels[value] ?? value.replace(/[-_]+/g, " ");
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

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

export function relatedProducts(product: Product, products: readonly Product[], limit = 4) {
  return products.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, limit);
}
