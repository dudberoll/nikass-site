import type { Product, ProductVariant } from "../data/catalog";

const SITE_URL = "https://nikass.ru";

export type BreadcrumbItem = { name: string; url?: string };

export function canonicalUrl(input: URL) {
  const pathname = input.pathname.replace(/\/+$/, "") || "/";
  return `${SITE_URL}${pathname}`;
}

const availabilityUrls = {
  "in-stock": "https://schema.org/InStock",
  preorder: "https://schema.org/PreOrder",
  unavailable: "https://schema.org/OutOfStock",
} as const;

const availabilityLabels = {
  "in-stock": "В наличии",
  preorder: "Предзаказ",
  unavailable: "Недоступен",
} as const;

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).href;
}

export function breadcrumbStructuredData(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      ...(url ? { item: absoluteUrl(url) } : {}),
    })),
  };
}

function variantUrl(productPath: string, sku: string) {
  const url = new URL(productPath, SITE_URL);
  url.searchParams.set("variant", sku);
  return url.href;
}

function variantProduct(product: Product, variant: ProductVariant, productPath: string) {
  const url = variantUrl(productPath, variant.sku);
  return {
    "@type": "Product",
    name: `${product.name} — ${variant.label}`,
    sku: variant.sku,
    url,
    image: absoluteUrl(variant.image ?? product.image),
    ...(product.description ? { description: product.description } : {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: "Вариант модели", value: variant.label },
      ...(variant.availability === "preorder"
        ? [{ "@type": "PropertyValue", name: "Наличие", value: availabilityLabels[variant.availability] }]
        : []),
    ],
    ...(variant.availability !== "preorder"
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: variant.price,
            priceCurrency: "RUB",
            availability: availabilityUrls[variant.availability],
          },
        }
      : {}),
  };
}

export function productStructuredData(product: Product) {
  const productPath = `/catalog/${product.slug}`;
  const variants = product.variants.map((variant) => variantProduct(product, variant, productPath));
  const brand = { "@type": "Brand", name: "NIKASS" };

  if (variants.length > 1) {
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${SITE_URL}${productPath}#product-group`,
      url: `${SITE_URL}${productPath}`,
      name: product.name,
      ...(product.description ? { description: product.description } : {}),
      image: absoluteUrl(product.image),
      brand,
      productGroupID: product.slug,
      variesBy: [{
        "@type": "PropertyValue",
        name: "Вариант модели",
        value: product.variants.map((variant) => variant.label),
      }],
      hasVariant: variants,
    };
  }

  if (variants[0]) {
    return {
      "@context": "https://schema.org",
      ...variants[0],
      name: product.name,
      brand,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: absoluteUrl(product.image),
    ...(product.description ? { description: product.description } : {}),
    brand,
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
