import type { AppEnv } from '../../env'
import { buildChatSystemPrompt } from './application/knowledge-base'
import { ChatFailure, type ChatProvider } from './application/ports'
import { createChatCompletionsProvider } from './infrastructure/chat-completions-provider'
import { createChatRoutes } from './transport/routes'

export function createChatModule({ env, provider }: { env: AppEnv; provider?: ChatProvider }) {
  return {
    routes: createChatRoutes(provider ?? providerFromEnv(env)),
  }
}

function providerFromEnv(env: AppEnv): ChatProvider {
  if (env.AI_PROVIDER === 'disabled' || !env.AI_API_URL || !env.AI_API_KEY) {
    return {
      respond: async () => {
        throw new ChatFailure('not_configured', 'AI provider is not configured')
      },
    }
  }

  return createChatCompletionsProvider({
    apiKey: env.AI_API_KEY,
    apiUrl: env.AI_API_URL,
    model: env.AI_MODEL,
    requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    systemPrompt: buildChatSystemPrompt(env.AI_SYSTEM_PROMPT),
    transcriptionUrl: env.AI_TRANSCRIPTION_URL,
  })
}

export type { ChatProvider } from './application/ports'
