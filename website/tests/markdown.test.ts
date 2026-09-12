import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdown } from "../src/components/MessageScrollerDemo";

test("parses the Markdown used in assistant replies", () => {
  assert.deepEqual(parseMarkdown("**Жирный текст**\n\n- Первый\n- Второй\n\n```ts\nconst answer = 42\n```"), [
    { type: "paragraph", lines: ["**Жирный текст**"] },
    { type: "unordered-list", items: ["Первый", "Второй"] },
    { type: "code", language: "ts", code: "const answer = 42" },
  ]);
});
