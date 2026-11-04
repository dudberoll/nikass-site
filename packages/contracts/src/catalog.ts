import { z } from 'zod'

// Online ordering is paused while the payment provider is unavailable.
export const CATALOG_MANAGER_ONLY = true

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
