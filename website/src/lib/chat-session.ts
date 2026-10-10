import { chatMessageSchema } from "@web-app-demo/contracts";

const CHAT_STORAGE_KEY = "nikass-chat";
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type ChatSession = { messages: ChatMessage[]; draft: string };
type ChatStorage = Pick<Storage, "getItem" | "setItem">;

export function parseChatSession(raw: string | null): ChatSession {
  const empty = { messages: [], draft: "" };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.messages) || value.messages.length > 201
      || typeof value.draft !== "string") return empty;
    const messages = value.messages.map((message: unknown, index: number) => {
      const { role, content } = chatMessageSchema.parse(message);
      return { id: `${role}-${index + 1}`, role, text: content };
    });
    return { messages, draft: value.draft };
  } catch { return empty; }
}

export function readChatSession(storage?: ChatStorage): ChatSession & { error: "read-failed" | null } {
  try { return { ...parseChatSession((storage ?? sessionStorage).getItem(CHAT_STORAGE_KEY)), error: null }; }
  catch { return { messages: [], draft: "", error: "read-failed" }; }
}

export function saveChatSession(session: ChatSession, storage?: ChatStorage): boolean {
  const messages = session.messages.filter(({ text }) => text.trim()).map(({ role, text: content }) => ({ role, content }));
  try {
    (storage ?? sessionStorage).setItem(CHAT_STORAGE_KEY, JSON.stringify({ version: 1, messages, draft: session.draft }));
    return true;
  } catch { return false; }
}
