import { z } from 'zod'

const cartItemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
}).strict()

export const cartReviewRequestSchema = z.object({
  version: z.literal(1),
  items: z.array(cartItemSchema).min(1).max(100),
}).strict().superRefine(({ items }, context) => {
  const keys = new Set<string>()
  items.forEach((item, index) => {
    const key = JSON.stringify([item.slug, item.sku])
    if (keys.has(key)) context.addIssue({ code: 'custom', path: ['items', index], message: 'Duplicate cart item' })
    keys.add(key)
  })
})

export const cartReviewResponseSchema = z.object({
  currency: z.literal('RUB'),
  checkedAt: z.string().datetime(),
  items: z.array(cartItemSchema.extend({
    status: z.enum(['in-stock', 'preorder', 'unavailable', 'missing']),
    unitPriceMinor: z.number().int().nonnegative().nullable(),
    lineTotalMinor: z.number().int().nonnegative().nullable(),
  })),
  subtotalMinor: z.number().int().nonnegative(),
}).strict()

export type CartReviewRequest = z.infer<typeof cartReviewRequestSchema>
export type CartReviewResponse = z.infer<typeof cartReviewResponseSchema>
