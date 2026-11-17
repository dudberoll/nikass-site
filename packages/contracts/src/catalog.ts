import { z } from 'zod'

export const catalogAvailabilityResponseSchema = z.object({
  items: z.array(z.object({
    slug: z.string().min(1),
    variants: z.array(z.object({
      sku: z.string().min(1),
      availability: z.enum(['in-stock', 'preorder', 'unavailable']),
    }).strict()).min(1),
  }).strict()),
  cachedAt: z.string().datetime(),
  stale: z.boolean(),
}).strict()

export type CatalogAvailabilityResponse = z.infer<typeof catalogAvailabilityResponseSchema>

// Only public product data may enter a permanently published website artifact.
export const publicCatalogProductSchema = z.object({
  slug: z.string().min(1), name: z.string().min(1), category: z.string(),
  discounted: z.boolean().optional(), images: z.array(z.string()),
  shortDescription: z.string(), description: z.string(),
  characteristics: z.record(z.string(), z.string()), packageContents: z.array(z.string()),
  warranty: z.string().optional(),
  variants: z.array(z.object({
    sku: z.string().min(1), label: z.string(), price: z.number().nonnegative(),
    oldPrice: z.number().nonnegative().optional(),
    availability: z.enum(['in-stock', 'preorder', 'unavailable']),
    salesMode: z.literal('manager').optional(),
  })).min(1),
})
export const catalogBuildResponseSchema = z.object({
  items: z.array(publicCatalogProductSchema).min(1), stale: z.literal(false),
})
