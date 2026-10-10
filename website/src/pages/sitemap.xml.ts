import { blogEntries } from "../data/blog";
import { loadCatalogProducts } from "../data/catalog";

export const prerender = true;

const siteUrl = "https://nikass.ru";
const staticPaths = [
  "/",
  "/catalog",
  "/discounted",
  "/blog",
  "/about",
  "/payment-and-delivery",
  "/return-policy",
  "/service-center",
  "/privacy-policy",
  "/advertising-consent",
  "/personal-data-consent",
];

export async function GET() {
  const products = await loadCatalogProducts("all");
  const paths = [
    ...staticPaths,
    ...blogEntries.map((entry) => `/blog/${entry.slug}`),
    ...products
      .filter((product) => !product.demo && product.slug !== "test")
      .map((product) => `/catalog/${product.slug}`),
  ];
  const urls = [...new Set(paths)]
    .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
