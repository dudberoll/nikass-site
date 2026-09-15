import {
  apiErrorSchema,
  chatRequestSchema,
  chatResponseSchema,
  chatTranscriptionResponseSchema,
} from '@web-app-demo/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'

import { AppError, validationErrorHook } from '../../../http/errors'
import { ChatService } from '../application/chat-service'
import type { ChatProvider } from '../application/ports'

const errorContent = {
  'application/json': {
    schema: apiErrorSchema,
  },
}

const maxAudioBytes = 25 * 1024 * 1024
const supportedAudioMimeTypes = new Set([
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
  'video/webm',
])
const audioUploadSchema = z.object({
  file: z.custom<File>(() => true).openapi({ type: 'string', format: 'binary' }),
}).strict()

export function createChatRoutes(provider: ChatProvider) {
  const service = new ChatService(provider)
  const routes = new OpenAPIHono({ defaultHook: validationErrorHook })

  routes.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    await next()
  })

  routes.openapi(createRoute({
    method: 'post',
    path: '/',
    request: {
      body: { required: true, content: { 'application/json': { schema: chatRequestSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: chatResponseSchema } }, description: 'AI assistant reply' },
      400: { content: errorContent, description: 'Invalid chat payload' },
      503: { content: errorContent, description: 'AI provider is unavailable' },
    },
  }), async (c) => {
    try {
      return c.json(await service.respond(c.req.valid('json')), 200)
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Сервис консультанта временно недоступен.')
    }
  })

  routes.openapi(createRoute({
    method: 'post',
    path: '/transcribe',
    request: {
      body: { required: true, content: { 'multipart/form-data': { schema: audioUploadSchema } } },
    },
    responses: {
      200: { content: { 'application/json': { schema: chatTranscriptionResponseSchema } }, description: 'Recognized audio text' },
      400: { content: errorContent, description: 'Invalid audio payload' },
      413: { content: errorContent, description: 'Audio file is too large' },
      503: { content: errorContent, description: 'Transcription provider is unavailable' },
    },
  }), async (c) => {
    if (!provider.transcribe) {
      throw new AppError(503, 'INTERNAL_ERROR', 'Сервис консультанта временно недоступен.')
    }

    let body: Record<string, File | string | File[]>
    try {
      body = await c.req.parseBody()
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Не удалось прочитать аудиозапись.')
    }

    const audio = body.file
    if (!isAudioFile(audio) || audio.size === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Нужен непустой аудиофайл.')
    }
    if (audio.size > maxAudioBytes) {
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Аудиофайл не должен быть больше 25 МБ.')
    }

    let text: string
    try {
      text = await provider.transcribe(audio)
    } catch {
      throw new AppError(503, 'INTERNAL_ERROR', 'Сервис распознавания временно недоступен.')
    }

    try {
      return c.json(chatTranscriptionResponseSchema.parse({ text }), 200)
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Голосовой запрос слишком длинный. Скажите короче.')
    }
  })

  return routes
}

function isAudioFile(value: unknown): value is File {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<File>
  const mimeType = typeof file.type === 'string' ? file.type.split(';', 1)[0]!.toLowerCase() : ''
  return typeof file.type === 'string'
    && supportedAudioMimeTypes.has(mimeType)
    && typeof file.size === 'number'
    && typeof file.arrayBuffer === 'function'
}
