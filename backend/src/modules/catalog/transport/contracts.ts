import { z } from 'zod'

const optionalQueryText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  )

export const catalogListQuerySchema = z
  .object({
    q: optionalQueryText(100),
    category: optionalQueryText(80),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sort: z.enum(['popularity', 'price_asc', 'price_desc', 'newest']).default('popularity'),
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'maxPrice must be greater than or equal to minPrice',
      })
    }
  })

export const catalogProductParamsSchema = z
  .object({
    slug: z.string().trim().min(1).max(200),
  })
  .strict()

const catalogVariantSchema = z
  .object({
    sku: z.string().min(1),
    label: z.string().min(1),
    price: z.number().nonnegative(),
    oldPrice: z.number().nonnegative().optional(),
    availability: z.enum(['in-stock', 'preorder', 'unavailable']),
  })
  .strict()

const catalogReviewSchema = z
  .object({
    author: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
  })
  .strict()

export const catalogProductSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    images: z.array(z.string()),
    shortDescription: z.string(),
    description: z.string(),
    characteristics: z.record(z.string(), z.string()),
    packageContents: z.array(z.string()),
    warrantyMonths: z.number().int().positive(),
    reviews: z.array(catalogReviewSchema),
    relatedProductSlugs: z.array(z.string()),
    promotionPeriod: z.string().optional(),
    popularity: z.number().nonnegative(),
    createdAt: z.string().datetime(),
    variants: z.array(catalogVariantSchema).min(1),
  })
  .strict()

const catalogCacheMetadataSchema = z
  .object({
    cachedAt: z.string().datetime(),
    stale: z.boolean(),
  })
  .strict()

export const catalogListResponseSchema = z
  .object({
    items: z.array(catalogProductSchema),
    page: z.number().int().positive(),
    perPage: z.number().int().positive().max(100),
    total: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    ...catalogCacheMetadataSchema.shape,
  })
  .strict()

export const catalogProductResponseSchema = z
  .object({
    product: catalogProductSchema,
    ...catalogCacheMetadataSchema.shape,
  })
  .strict()
