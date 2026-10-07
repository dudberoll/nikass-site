import { z } from 'zod'

export const restockChannelSchema = z.enum(['phone', 'telegram', 'max', 'whatsapp'])
export const restockChannelLabels = { phone: 'Телефон', telegram: 'Telegram', max: 'MAX', whatsapp: 'WhatsApp' } as const
const isPhone = (value: string) => /^\+?[1-9]\d{9,14}$/.test(value.replace(/[\s()-]/g, ''))
const normalizePhone = (value: string) => `+${value.replace(/[^\d]/g, '').replace(/^8(?=\d{10}$)/, '7')}`

export const restockRequestSchema = z.strictObject({
  requestId: z.uuid(),
  slug: z.string().trim().min(1).max(240),
  sku: z.string().trim().min(1).max(100),
  channel: restockChannelSchema,
  contact: z.string().trim().min(1, 'Укажите контакт для связи.').max(150).refine((value) => !/[\r\n]/.test(value), 'Укажите один контакт.'),
  consent: z.literal(true, { error: 'Подтвердите согласие на обработку контакта.' }),
  website: z.literal('').default(''),
}).superRefine(({ channel, contact }, ctx) => {
  const phone = isPhone(contact)
  const valid = channel === 'telegram'
    ? /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(contact.replace(/^https:\/\/t\.me\//, ''))
    : channel === 'max'
      ? phone || /^@?[a-zA-Z0-9_.-]{3,100}$/.test(contact) || /^https:\/\/max\.ru\/[a-zA-Z0-9/_-]+$/.test(contact)
      : phone
  if (!valid) ctx.addIssue({ code: 'custom', path: ['contact'], message: channel === 'telegram'
    ? 'Укажите @username или ссылку https://t.me/username.'
    : channel === 'max' ? 'Укажите телефон с кодом страны, никнейм или ссылку на профиль MAX.' : 'Укажите телефон с кодом страны, например +7 999 123-45-67.' })
}).transform((input) => ({ ...input, contact: input.channel === 'phone' || input.channel === 'whatsapp' || input.channel === 'max' && isPhone(input.contact)
  ? normalizePhone(input.contact)
  : input.channel === 'telegram' ? `@${input.contact.replace(/^https:\/\/t\.me\//, '').replace(/^@/, '')}` : input.contact }))

export const restockResponseSchema = z.object({ requestId: z.uuid(), status: z.literal('accepted') })
export type RestockRequest = z.infer<typeof restockRequestSchema>
export type RestockChannel = z.infer<typeof restockChannelSchema>
