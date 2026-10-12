import assert from "node:assert/strict";
// @ts-expect-error This test-only mock API is provided by Bun, not Astro's TypeScript config.
import { mock } from "bun:test";
import test from "node:test";
import sharp from "sharp";
import sharpService from "astro/assets/services/sharp";

let resizeFit: string | undefined;

mock.module("astro:assets", () => ({
  getImage: async ({ src, fit }: { src: string; fit?: string }) => {
    resizeFit = fit;
    return {
      src: `/_astro/${src.split("/").at(-1)}.webp`,
      srcSet: { attribute: `/_astro/${src.split("/").at(-1)}.webp 320w` },
    };
  },
}));

const { optimizeCatalogImages } = await import("../src/data/catalog-images");

test("maps optimized variant sources into the fields consumed by variant selectors", async () => {
  const [product] = await optimizeCatalogImages([{
    slug: "product",
    sku: "SKU-1",
    name: "Product",
    category: "",
    rawCategory: "",
    price: 1,
    description: "",
    packageContents: "",
    characteristics: "",
    image: "https://nikass.ru/wp-content/uploads/main.png",
    images: [
      "https://nikass.ru/wp-content/uploads/discounted-main.png",
      "https://nikass.ru/wp-content/uploads/defect-detail.png",
    ],
    variants: [{
      sku: "SKU-2",
      image: "https://nikass.ru/wp-content/uploads/variant.png",
      label: "Variant",
      price: 2,
      availability: "in-stock",
    }],
  }]);

  assert.equal(product?.variants[0]?.image, "/_astro/variant.png.webp");
  assert.equal(product?.variants[0]?.imageSrcSet, "/_astro/variant.png.webp 320w");
  assert.equal("src" in (product?.variants[0] ?? {}), false);
  assert.equal("srcSet" in (product?.variants[0] ?? {}), false);
  assert.deepEqual(product?.images, [
    "https://nikass.ru/wp-content/uploads/discounted-main.png",
    "https://nikass.ru/wp-content/uploads/defect-detail.png",
  ]);
  assert.deepEqual(product?.galleryImages, [{
    src: "/_astro/defect-detail.png.webp",
    srcSet: "/_astro/defect-detail.png.webp 320w",
  }]);

  // Remote inferSize keeps the original height alongside the requested width.
  const input = await sharp({ create: { width: 128, height: 128, channels: 3, background: "white" } }).png().toBuffer();
  const options = { src: "https://nikass.ru/wp-content/uploads/main.png", width: 32, height: 128, format: "webp" as const, fit: resizeFit };
  const config = {
    service: { entrypoint: "astro/assets/services/sharp", config: {} },
    endpoint: { route: "/_image" },
    dangerouslyProcessSVG: false,
    domains: [],
    remotePatterns: [],
    responsiveStyles: false,
  };
  const srcSet = await sharpService.getSrcSet!({ ...options, widths: [16, 32, 64] }, config, console);
  for (const transform of [options, ...srcSet.map((item) => item.transform)]) {
    const resized = await sharpService.transform(input, { ...transform, src: options.src }, config, console);
    const metadata = await sharp(resized.data).metadata();
    assert.equal(metadata.width, metadata.height, "optimization must preserve the full square image at every srcset size");
  }
});
