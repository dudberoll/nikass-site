import { getImage } from "astro:assets";

import type { Product } from "./catalog";

const imageSets = new Map<string, Promise<{ src: string; srcSet?: string }>>();
const MAX_CONCURRENT_IMAGE_PROBES = 3;
let availableImageProbeSlots = MAX_CONCURRENT_IMAGE_PROBES;
const waitingImageProbes: Array<() => void> = [];

async function withImageProbeSlot<T>(operation: () => Promise<T>) {
  if (availableImageProbeSlots === 0) {
    await new Promise<void>((resolve) => waitingImageProbes.push(resolve));
  } else {
    availableImageProbeSlots -= 1;
  }

  try {
    return await operation();
  } finally {
    const next = waitingImageProbes.shift();
    if (next) next();
    else availableImageProbeSlots += 1;
  }
}

function optimizeImage(src: string) {
  let image = imageSets.get(src);
  if (!image) {
    image = src.startsWith("https://nikass.ru/wp-content/uploads/")
      ? withImageProbeSlot(async () => {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              const optimized = await getImage({ src, width: 320, widths: [96, 160, 320, 640, 960, 1200], format: "webp", quality: 80, inferSize: true, fit: "inside" });
              return { src: optimized.src, srcSet: optimized.srcSet.attribute };
            } catch (error) {
              if (attempt === 2) {
                console.warn(`Could not optimize catalog image; using its original URL: ${src}`);
                return { src };
              }
              await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 500));
            }
          }
          return { src };
        })
      : Promise.resolve({ src });
    imageSets.set(src, image);
  }
  return image;
}

export async function optimizeCatalogImages(products: readonly Product[]) {
  return Promise.all(products.map(async (product) => {
    const [image, variants, galleryImages] = await Promise.all([
      optimizeImage(product.image),
      Promise.all(product.variants.map(async (variant) => {
        const optimizedImage = await optimizeImage(variant.image ?? product.image);
        return { ...variant, image: optimizedImage.src, imageSrcSet: optimizedImage.srcSet };
      })),
      Promise.all((product.images ?? []).slice(1).map(optimizeImage)),
    ]);

    return {
      ...product,
      image: image.src,
      imageSrcSet: image.srcSet,
      galleryImages,
      variants,
    };
  }));
}
