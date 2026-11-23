import { AVAILABILITY_LABELS, detailLines, detailRows, type Product, type ProductVariant } from "../data/catalog";
import { productVariantPath } from "./product-variant-url";

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

function variantProduct(product: Product, variant: ProductVariant) {
  const url = absoluteUrl(productVariantPath(product, variant.sku));
  const description = product.variantDescriptions?.[variant.sku] || product.description;
  const characteristics = detailRows(product.variantCharacteristics?.[variant.sku] ?? product.characteristics);
  const kit = detailLines(product.variantPackageContents?.[variant.sku] ?? product.packageContents);
  return {
    "@type": "Product",
    name: `${product.name} — ${variant.label}`,
    sku: variant.sku,
    url,
    image: absoluteUrl(variant.image ?? product.image),
    ...(description ? { description } : {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: "Вариант модели", value: variant.label },
      ...(variant.availability === "preorder"
        ? [{ "@type": "PropertyValue", name: "Наличие", value: AVAILABILITY_LABELS[variant.availability] }]
        : []),
      ...characteristics.filter(([name, value]) => name !== "Артикул" && name !== "Дополнительные артикулы" && value)
        .map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
      ...(kit.length ? [{ "@type": "PropertyValue", name: "Комплектация", value: kit.join("; ") }] : []),
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
  const variants = product.variants.map((variant) => variantProduct(product, variant));
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
      variesBy: "Вариант модели",
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
