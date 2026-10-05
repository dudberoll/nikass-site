import { z } from 'zod'

const chatReplySchema = z.string().trim().min(1).max(12_000)

export const chatMessageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('user'),
    content: z.string().trim().min(1).max(4_000),
  }).strict(),
  z.object({
    role: z.literal('assistant'),
    content: chatReplySchema,
  }).strict(),
])

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(200),
  })
  .strict()

export const chatResponseSchema = z
  .object({
    reply: chatReplySchema,
  })
  .strict()

export const chatTranscriptionResponseSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
  })
  .strict()

export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatResponse = z.infer<typeof chatResponseSchema>
export type ChatTranscriptionResponse = z.infer<typeof chatTranscriptionResponseSchema>
