import type { ChatMessage } from '@web-app-demo/contracts'

import { calculateEnergyBudget, type EnergyBudgetInput } from '../application/energy-calculator'
import { ChatFailure, type ChatProviderRequestOptions } from '../application/ports'

export type { ChatProviderRequestOptions } from '../application/ports'

type ChatCompletionsProviderOptions = {
  apiKey: string
  apiUrl: string
  model: string
  requestTimeoutMs: number
  systemPrompt: string
  transcriptionUrl?: string
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function createChatCompletionsProvider({
  apiKey,
  apiUrl,
  model,
  requestTimeoutMs,
  systemPrompt,
  transcriptionUrl = deriveTranscriptionUrl(apiUrl),
  fetchImpl = fetch,
}: ChatCompletionsProviderOptions) {
  return {
    async transcribe(audio: File) {
      const requestController = new AbortController()
      const timeout = setTimeout(() => requestController.abort(), requestTimeoutMs)
      try {
        const form = new FormData()
        form.append('file', audio, audio.name || 'voice.webm')
        form.append('model', 'openai/whisper-large-v3')
        form.append('response_format', 'text')
        form.append('temperature', '0.5')
        form.append('language', 'ru')
        const response = await fetchImpl(transcriptionUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: requestController.signal,
        })
        if (!response.ok) throw new ChatFailure('unavailable', 'Audio transcription is unavailable')
        const text = extractTranscriptionText(await response.text())
        if (!text) throw new ChatFailure('invalid_response', 'Audio transcription returned an empty reply')
        return text
      } catch (error) {
        if (error instanceof ChatFailure) throw error
        throw new ChatFailure('unavailable', 'Audio transcription is unavailable')
      } finally {
        clearTimeout(timeout)
      }
    },
    async respond(messages: readonly ChatMessage[], requestOptions: ChatProviderRequestOptions = {}) {
      const requestMessages: ApiMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ]
      try {
        const payload = await complete(requestMessages, requestOptions.useEnergyTool === true)
        const toolCall = requestOptions.useEnergyTool ? extractEnergyToolCall(payload) : null
        if (toolCall) {
          let result
          try {
            result = calculateEnergyBudget(parseEnergyInput(toolCall.arguments))
          } catch {
            throw new ChatFailure('invalid_response', 'AI provider returned invalid tool arguments')
          }
          requestMessages.push(
            { role: 'assistant', content: null, tool_calls: [toolCall.raw] },
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: 'calculate_energy_budget',
              content: JSON.stringify(result),
            },
          )
          const finalPayload = await complete(requestMessages, false)
          const reply = extractReply(finalPayload)
          if (!reply) throw new ChatFailure('invalid_response', 'AI provider returned an invalid reply')
          return reply
        }

        const reply = extractReply(payload)
        if (!reply) throw new ChatFailure('invalid_response', 'AI provider returned an invalid reply')
        return reply
      } catch (error) {
        if (error instanceof ChatFailure) throw error
        throw new ChatFailure('unavailable', 'AI provider is unavailable')
      }

      async function complete(messagesToSend: readonly ApiMessage[], offerEnergyTool: boolean) {
        const requestController = new AbortController()
        const timeout = setTimeout(() => requestController.abort(), requestTimeoutMs)
        try {
          const response = await fetchImpl(apiUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: messagesToSend,
              ...(offerEnergyTool ? {
                tools: [energyCalculatorTool],
                tool_choice: 'auto',
                parallel_tool_calls: false,
              } : {}),
            }),
            signal: requestController.signal,
          })
          if (!response.ok) throw new ChatFailure('unavailable', 'AI provider is unavailable')
          return await response.json() as unknown
        } finally {
          clearTimeout(timeout)
        }
      }
    },
  }
}

function deriveTranscriptionUrl(apiUrl: string) {
  const url = new URL(apiUrl)
  url.pathname = url.pathname.replace(/\/chat\/completions\/?$/, '/audio/transcriptions')
  return url.toString()
}

function extractTranscriptionText(body: string) {
  const trimmedBody = body.trim()
  try {
    const payload: unknown = JSON.parse(trimmedBody)
    if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
      return payload.text.trim()
    }
  } catch {
    // The provider may return plain text when response_format=text is honored.
  }
  return trimmedBody
}

type ApiMessage = {
  role: string
  content: unknown
  tool_calls?: unknown[]
  tool_call_id?: string
  name?: string
}

const energyCalculatorTool = {
  type: 'function',
  function: {
    name: 'calculate_energy_budget',
    description: 'Рассчитать запас энергии станции для списка устройств. Не угадывай отсутствующие характеристики.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['devices'],
      properties: {
        stationCapacityWh: { type: 'number', description: 'Ёмкость станции в Wh из карточки или инструкции.' },
        stationMaxOutputW: { type: 'number', description: 'Номинальная выходная мощность станции в W; без неё совместимость по пиковой нагрузке не подтверждается.' },
        devices: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'powerW'],
            properties: {
              name: { type: 'string' },
              powerW: { type: 'number', description: 'Потребляемая мощность одного устройства в W.' },
              hours: { type: 'number', description: 'Время работы в часах, только если оно явно указано пользователем.' },
              quantity: { type: 'integer', minimum: 1, description: 'Количество одинаковых устройств.' },
            },
          },
        },
      },
    },
  },
} as const

function extractEnergyToolCall(payload: unknown) {
  const message = extractMessage(payload)
  const calls = message?.tool_calls
  const call = Array.isArray(calls) ? calls[0] : null
  if (!call || typeof call !== 'object') return null
  const functionCall = (call as { function?: unknown }).function
  if (!functionCall || typeof functionCall !== 'object') return null
  const name = (functionCall as { name?: unknown }).name
  const argumentsValue = (functionCall as { arguments?: unknown }).arguments
  if (name !== 'calculate_energy_budget' || typeof argumentsValue !== 'string') {
    throw new ChatFailure('invalid_response', 'AI provider returned an invalid tool call')
  }
  const id = (call as { id?: unknown }).id
  if (typeof id !== 'string' || !id) throw new ChatFailure('invalid_response', 'AI provider returned an invalid tool call')
  return {
    id,
    arguments: argumentsValue,
    raw: call,
  }
}

function parseEnergyInput(argumentsValue: string): EnergyBudgetInput {
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsValue)
  } catch {
    throw new ChatFailure('invalid_response', 'AI provider returned invalid tool arguments')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ChatFailure('invalid_response', 'AI provider returned invalid tool arguments')
  }
  return parsed as EnergyBudgetInput
}

function extractReply(payload: unknown) {
  const message = extractMessage(payload)
  const content = message?.content
  if (typeof content === 'string') return content.trim() || null
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

function extractMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const choices = (payload as { choices?: unknown }).choices
  const choice = Array.isArray(choices) ? choices[0] : null
  if (!choice || typeof choice !== 'object') return null
  const message = (choice as { message?: unknown }).message
  return message && typeof message === 'object' ? message as ApiMessage : null
}
