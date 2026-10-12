export function selectedVariantSku(search: string, variants: readonly { sku: string }[]) {
  const requestedSku = new URLSearchParams(search).get("variant");
  return variants.find((variant) => variant.sku === requestedSku)?.sku ?? variants[0]?.sku;
}

export function productVariantUrl(href: string, sku: string) {
  const url = new URL(href);
  url.searchParams.set("variant", sku);
  return `${url.pathname}${url.search}${url.hash}`;
}
