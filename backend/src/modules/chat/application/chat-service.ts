import { chatRequestSchema, chatResponseSchema, type ChatRequest } from '@web-app-demo/contracts'

import { ChatFailure, type ChatProvider } from './ports'

export class ChatService {
  constructor(private readonly provider: ChatProvider) {}

  async respond(value: ChatRequest) {
    const input = chatRequestSchema.parse(value)
    const reply = (await this.provider.respond(input.messages)).trim()
    return chatResponseSchema.parse({ reply })
  }
}
