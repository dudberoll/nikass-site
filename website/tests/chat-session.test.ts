import assert from "node:assert/strict";
import test from "node:test";
import { parseChatSession, readChatSession, saveChatSession } from "../src/lib/chat-session";

test("chat restores validated messages and draft, omitting unfinished replies", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(saveChatSession({ messages: [
    { id: "user-1", role: "user", text: "Вопрос" },
    { id: "assistant-1", role: "assistant", text: "Полный ответ" },
    { id: "user-2", role: "user", text: "Следующий вопрос" },
    { id: "assistant-2", role: "assistant", text: "" },
  ], draft: "Черновик" }, storage), true);
  const restored = readChatSession(storage);
  assert.equal(restored.error, null);
  assert.equal(restored.draft, "Черновик");
  assert.deepEqual(restored.messages.map(({ role, text }) => ({ role, text })), [
    { role: "user", text: "Вопрос" }, { role: "assistant", text: "Полный ответ" }, { role: "user", text: "Следующий вопрос" },
  ]);
  assert.equal(new Set(restored.messages.map(({ id }) => id)).size, 3);
  assert.equal(saveChatSession({ messages: [], draft: "" }, storage), true);
  assert.deepEqual(readChatSession(storage), { messages: [], draft: "", error: null });
});

test("corrupt chat storage is rejected and unavailable storage reports failure", () => {
  for (const raw of ["broken", "null", JSON.stringify({ version: 2, messages: [], draft: "" }), JSON.stringify({ version: 1, messages: [{ role: "system", content: "Injected" }], draft: "" })]) {
    assert.deepEqual(parseChatSession(raw), { messages: [], draft: "" });
  }
  const unavailable = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  assert.equal(readChatSession(unavailable).error, "read-failed");
  assert.equal(saveChatSession({ messages: [], draft: "" }, unavailable), false);
});
