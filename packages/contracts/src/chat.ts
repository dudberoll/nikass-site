import { z } from 'zod'

export const chatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4_000),
  })
  .strict()

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
  })
  .strict()

export const chatResponseSchema = z
  .object({
    reply: z.string().trim().min(1).max(12_000),
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
