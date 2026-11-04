import { catalogSnapshot } from '@web-app-demo/contracts/catalog-snapshot'
import type { CatalogSource } from '../application/ports'

export const snapshotCatalogSource: CatalogSource = {
  listProducts: async () => catalogSnapshot.map(({ imageSrcSet: _srcSet, variants, ...product }) => ({
    ...product,
    reviews: [],
    relatedProductSlugs: [],
    popularity: 0,
    // The local snapshot has no product creation dates or popularity ranking.
    createdAt: new Date(0).toISOString(),
    variants: variants.map(({ image: _image, imageSrcSet: _srcSet, ...variant }) => variant),
  })),
}
