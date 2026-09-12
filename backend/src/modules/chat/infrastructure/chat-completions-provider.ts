import type { ChatMessage } from '@web-app-demo/contracts'

import { ChatFailure } from '../application/ports'

type ChatCompletionsProviderOptions = {
  apiKey: string
  apiUrl: string
  model: string
  requestTimeoutMs: number
  systemPrompt: string
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function createChatCompletionsProvider({
  apiKey,
  apiUrl,
  model,
  requestTimeoutMs,
  systemPrompt,
  fetchImpl = fetch,
}: ChatCompletionsProviderOptions) {
  return {
    async respond(messages: readonly ChatMessage[]) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

      try {
        const response = await fetchImpl(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new ChatFailure('unavailable', 'AI provider is unavailable')

        const reply = extractReply(await response.json())
        if (!reply) throw new ChatFailure('invalid_response', 'AI provider returned an invalid reply')
        return reply
      } catch (error) {
        if (error instanceof ChatFailure) throw error
        throw new ChatFailure('unavailable', 'AI provider is unavailable')
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

function extractReply(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const choices = (payload as { choices?: unknown }).choices
  const choice = Array.isArray(choices) ? choices[0] : null
  if (!choice || typeof choice !== 'object') return null
  const content = (choice as { message?: { content?: unknown } }).message?.content
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return null

  const text = content
    .filter((part): part is { text: string } =>
      Boolean(part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'),
    )
    .map((part) => part.text)
    .join('')
    .trim()
  return text || null
}
