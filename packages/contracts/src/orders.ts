import { z } from 'zod'
import { cartReviewRequestSchema } from './cart'

const text = (min: number, max: number) => z.string().trim().min(min).max(max).regex(/^[^\x00-\x1f\x7f]*$/u, 'Недопустимые символы')
export const orderCustomerSchema = z.object({
  name: text(2, 100).regex(/^\S+\s+\S.*$/u, 'Введите имя и фамилию'),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]+$/, 'Проверьте телефон')
    .transform((value) => value.replace(/[\s()-]/g, '').replace(/^8(?=\d{10}$)/, '+7'))
    .pipe(z.string().regex(/^\+7\d{10}$/, 'Введите российский телефон: +7 и 10 цифр')),
  email: z.string().trim().toLowerCase().email().max(254),
  deliveryMethod: z.enum(['delivery', 'pickup']).optional(),
  region: text(2, 100),
  city: text(2, 100),
  street: text(2, 150),
  house: text(1, 30),
  apartment: text(0, 30),
  postcode: z.string().trim().regex(/^(?:\d{6})?$/, 'Введите индекс из 6 цифр'),
  comment: text(0, 1000),
  consent: z.literal(true, { error: 'Необходимо согласие с условиями покупки и обработкой данных' }),
}).strict()

export const orderQuoteRequestSchema = z.object({
  cart: cartReviewRequestSchema,
  customer: orderCustomerSchema,
  promoCode: text(0, 100).transform((value) => value.toLowerCase()),
}).strict()
export const orderTokenRequestSchema = z.object({ checkoutToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const orderTotalsSchema = z.object({
  currency: z.literal('RUB'),
  items: z.array(z.object({ sku: z.string().min(1), name: z.string().min(1), quantity: z.number().int().positive(), totalMinor: money }).strict()).min(1),
  discountMinor: money,
  shippingMinor: z.literal(0),
  totalMinor: money,
}).strict()
export const orderQuoteResponseSchema = z.object({
  checkoutToken: orderTokenRequestSchema.shape.checkoutToken,
  expiresAt: z.string().datetime(),
  totals: orderTotalsSchema,
}).strict()
export const orderResultSchema = z.object({
  state: z.enum(['quoted', 'submitting', 'confirmed', 'uncertain', 'rejected']),
  orderNumber: z.string().min(1).nullable(),
}).strict()
export const paymentStartResponseSchema = z.object({
  paymentId: z.string().uuid(),
  confirmationUrl: z.string().url(),
}).strict()
export const paymentStatusRequestSchema = z.object({ paymentId: z.string().uuid() }).strict()
export const paymentStatusResponseSchema = z.object({
  paymentId: z.string().uuid(),
  paymentState: z.enum(['not_started', 'pending', 'succeeded', 'canceled']),
  fulfillmentState: z.enum(['not_started', 'queued', 'processing', 'confirmed', 'uncertain', 'skipped']),
  orderNumber: z.string().min(1).nullable(),
}).strict()
export type OrderQuoteRequest = z.infer<typeof orderQuoteRequestSchema>
export type OrderTotals = z.infer<typeof orderTotalsSchema>
export type OrderResult = z.infer<typeof orderResultSchema>
export type PaymentStatusResponse = z.infer<typeof paymentStatusResponseSchema>
