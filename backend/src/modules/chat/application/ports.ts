import type { ChatMessage } from '@web-app-demo/contracts'

export type ChatProvider = {
  respond: (messages: readonly ChatMessage[]) => Promise<string>
}

export type ChatFailureKind = 'not_configured' | 'unavailable' | 'invalid_response'

export class ChatFailure extends Error {
  constructor(
    readonly kind: ChatFailureKind,
    message: string,
  ) {
    super(message)
    this.name = 'ChatFailure'
  }
}
