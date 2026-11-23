type ProductVariants = { slug: string; variants: readonly { sku: string }[] };

export function productVariantPath(product: ProductVariants, sku?: string) {
  const path = `/catalog/${product.slug}`;
  if (!sku || product.variants.length < 2) return path;
  const segment = encodeURIComponent(sku).replace(/~/g, "%7E").replace(/%/g, "~");
  return `${path}/sku-${segment}`;
}

export function selectedVariantSku(location: Pick<Location, "pathname" | "search">, product: ProductVariants) {
  if (product.variants.length < 2) return product.variants[0]?.sku;
  const path = location.pathname.replace(/\/+$/, "");
  const requestedSku = new URLSearchParams(location.search).get("variant");
  return product.variants.find(({ sku }) => path === productVariantPath(product, sku))?.sku
    ?? product.variants.find(({ sku }) => sku === requestedSku)?.sku
    ?? product.variants[0]?.sku;
}
