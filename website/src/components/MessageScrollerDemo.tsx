import { Fragment, useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { MessageScroller } from "@shadcn/react/message-scroller";
import { chatResponseSchema, chatTranscriptionResponseSchema } from "@web-app-demo/contracts";
import { convertAudioToWav } from "../lib/audio";

type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  author: string;
  time: string;
  text: string;
};

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; code: string; language: string };

const blockStartPattern = /^(?:\s*```|\s*#{1,6}\s+|\s*[-*+]\s+|\s*\d+\.\s+|\s*>\s?|\s{0,3}(?:---+|\*\s*\*\s*\*|___+))/.source;

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```(\S*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", code: codeLines.join("\n"), language: fence[1] ?? "" });
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unorderedItem) {
      const items = [unorderedItem[1]];
      index += 1;
      while (index < lines.length) {
        const nextItem = lines[index].match(/^\s*[-*+]\s+(.+)$/);
        if (!nextItem) break;
        items.push(nextItem[1]);
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      const items = [orderedItem[1]];
      index += 1;
      while (index < lines.length) {
        const nextItem = lines[index].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!nextItem) break;
        items.push(nextItem[1]);
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^\s{0,3}(?:---+|\*\s*\*\s*\*|___+)\s*$/.test(line)) {
      blocks.push({ type: "paragraph", lines: ["—"] });
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !new RegExp(blockStartPattern).test(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderInline(text: string): ReactNode[] {
  const tokenPattern = /(`[^`\n]+`|\[[^\]\n]+\]\([^)]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${match.index}-${nodes.length}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[") ) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link ? safeHref(link[2]) : null;
      nodes.push(link && href ? <a key={key} href={href} target="_blank" rel="noreferrer">{renderInline(link[1])}</a> : token);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2))}</strong>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{renderInline(token.slice(2, -2))}</del>);
    } else {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1))}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function MarkdownLines({ lines, prefix }: { lines: string[]; prefix: string }) {
  return <>{lines.map((line, index) => <Fragment key={`${prefix}-${index}`}>{renderInline(line)}{index < lines.length - 1 && <br />}</Fragment>)}</>;
}

function MarkdownMessage({ text }: { text: string }) {
  return <div className="message-scroller-markdown">
    {parseMarkdown(text).map((block, index) => {
      const key = `markdown-${index}`;
      if (block.type === "heading") {
        if (block.level === 1) return <h2 key={key}>{renderInline(block.text)}</h2>;
        if (block.level === 2) return <h3 key={key}>{renderInline(block.text)}</h3>;
        return <h4 key={key}>{renderInline(block.text)}</h4>;
      }
      if (block.type === "unordered-list") return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>)}</ul>;
      if (block.type === "ordered-list") return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>)}</ol>;
      if (block.type === "blockquote") return <blockquote key={key}><MarkdownLines lines={block.lines} prefix={key} /></blockquote>;
      if (block.type === "code") return <pre key={key}><code>{block.code}</code></pre>;
      return <p key={key}><MarkdownLines lines={block.lines} prefix={key} /></p>;
    })}
  </div>;
}

function EmptyState() {
  return <div className="message-scroller-empty" aria-live="polite">
    <div className="message-scroller-empty-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M11.1 6.5 8 9.1m-3 7.1-.2 3.8m4.2 6.1 3.5 1.1m6.6.1 3.4-1.7m3.7-5.2.1-3.8m-3.3-6.3-3-2.1M14.5 5.3l3.7-.1" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="3.3 4.1" />
      </svg>
    </div>
    <h2>Morning, shadcn!</h2>
    <p>What are we working on today? Press send to start a new conversation</p>
  </div>;
}

function ResetIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 11a8.1 8.1 0 0 0-14.9-4.3L3.2 9.2M3 4v5.3h5.3M4 13a8.1 8.1 0 0 0 14.9 4.3l1.9-2.5M21 20v-5.3h-5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function SendIcon({ direction = "up" }: { direction?: "up" | "down" }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 19V5m0 0L6.5 10.5M12 5l5.5 5.5" transform={direction === "down" ? "rotate(180 12 12)" : undefined} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function MicIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="8" y="3.5" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
  </svg>;
}

function HumanAvatar() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.2" fill="currentColor" />
    <path d="M5.5 20c.7-3.8 3-5.8 6.5-5.8s5.8 2 6.5 5.8" fill="currentColor" />
  </svg>;
}

function MessageScrollerPanel({
  messages,
  streaming,
  error,
  recording,
  transcribing,
  onReset,
  onSend,
  onStartRecording,
  onStopRecording,
}: {
  messages: ChatUiMessage[];
  streaming: boolean;
  error: string;
  recording: boolean;
  transcribing: boolean;
  onReset: () => void;
  onSend: (text: string) => void | Promise<void>;
  onStartRecording: () => void | Promise<void>;
  onStopRecording: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = streaming || recording || transcribing;
  const hasDraft = Boolean(draft.trim());

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
    input.style.overflowY = input.scrollHeight > 132 ? "auto" : "hidden";
  }, [draft]);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !hasDraft) return;
    onSend(draft);
    setDraft("");
  }

  function reset() {
    setDraft("");
    onReset();
  }

  return <section className="message-scroller-card" aria-label="New chat">
    <header className="message-scroller-header">
      <div>
        <h1>New Chat</h1>
        <p>How can I help you today?</p>
      </div>
      <button className="message-scroller-reset" type="button" onClick={reset} aria-label="Начать новый чат">
        <ResetIcon />
      </button>
    </header>

    <div className="message-scroller-body">
      {error && <p className="message-scroller-error" role="alert">{error}</p>}
      <MessageScroller.Root className="message-scroller-root">
        <MessageScroller.Viewport className="message-scroller-viewport">
          <MessageScroller.Content className="message-scroller-content" aria-busy={streaming}>
            {messages.map((message) => <MessageScroller.Item className="message-scroller-row" key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
              <article className={`message-scroller-message is-${message.role}`}>
                <div className="message-scroller-avatar" aria-hidden="true">{message.role === "user" ? <HumanAvatar /> : "N"}</div>
                <div className="message-scroller-bubble">
                  <div className="message-scroller-message-meta"><strong>{message.author}</strong><time>{message.time}</time></div>
                  <MarkdownMessage text={message.text || "Печатает…"} />
                </div>
              </article>
            </MessageScroller.Item>)}
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button className="message-scroller-end-button" direction="end" aria-label="К последнему сообщению"><SendIcon direction="down" /></MessageScroller.Button>
        {messages.length === 0 && <EmptyState />}
      </MessageScroller.Root>
    </div>

    <form className="message-scroller-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="message-scroller-input">Новое сообщение</label>
      <textarea disabled={busy} ref={inputRef} id="message-scroller-input" value={draft} placeholder={recording ? "Говорите… нажмите ещё раз для остановки" : transcribing ? "Распознаю голос…" : "Напишите сообщение или нажмите микрофон"} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} />
      <button
        className={`message-scroller-send${recording ? " is-recording" : ""}`}
        type={hasDraft ? "submit" : "button"}
        disabled={streaming || transcribing}
        onClick={() => {
          if (recording) onStopRecording();
          else if (!hasDraft) void onStartRecording();
        }}
        aria-label={recording ? "Остановить запись" : transcribing ? "Распознаю голос" : hasDraft ? "Отправить сообщение" : "Записать голос"}
      >
        {recording ? <StopIcon /> : hasDraft ? <SendIcon /> : <MicIcon />}
      </button>
      <span className="sr-only" role="status">{recording ? "Идёт запись голоса" : transcribing ? "Распознаю голос" : ""}</span>
    </form>
  </section>;
}

export default function MessageScrollerDemo({ apiBase }: { apiBase: string }) {
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(0);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingAttempt = useRef(0);
  const recordingStartPending = useRef(false);
  const transcribingRef = useRef(false);
  const transcriptionAttempt = useRef(0);
  const chatAttempt = useRef(0);
  const recordingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAssistantId = useRef<string | null>(null);

  useEffect(() => {
    const handleChatClose = () => cancelVoiceInput();
    document.addEventListener("nikass:chat-close", handleChatClose);
    return () => {
      recordingAttempt.current += 1;
      recordingStartPending.current = false;
      transcriptionAttempt.current += 1;
      chatAttempt.current += 1;
      document.removeEventListener("nikass:chat-close", handleChatClose);
      if (streamTimer.current) clearInterval(streamTimer.current);
      if (recordingStopTimer.current) clearTimeout(recordingStopTimer.current);
      requestController.current?.abort();
      const recorder = mediaRecorder.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }
      recordingStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function releaseRecording() {
    recordingAttempt.current += 1;
    recordingStartPending.current = false;
    if (recordingStopTimer.current) clearTimeout(recordingStopTimer.current);
    recordingStopTimer.current = null;
    const recorder = mediaRecorder.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    mediaRecorder.current = null;
    recordingStream.current?.getTracks().forEach((track) => track.stop());
    recordingStream.current = null;
    recordingChunks.current = [];
    setRecording(false);
  }

  function cancelChatActivity() {
    transcriptionAttempt.current += 1;
    chatAttempt.current += 1;
    transcribingRef.current = false;
    requestController.current?.abort();
    requestController.current = null;
    if (streamTimer.current) clearInterval(streamTimer.current);
    streamTimer.current = null;
    if (activeAssistantId.current) {
      const assistantId = activeAssistantId.current;
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      activeAssistantId.current = null;
    }
    setStreaming(false);
    setTranscribing(false);
  }

  function cancelVoiceInput() {
    releaseRecording();
    cancelChatActivity();
  }

  function reset() {
    releaseRecording();
    cancelChatActivity();
    setError("");
    setMessages([]);
  }

  async function transcribeAudio(audio: Blob) {
    const attempt = ++transcriptionAttempt.current;
    transcribingRef.current = true;
    setTranscribing(true);
    setError("");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const wav = await convertAudioToWav(audio);
      const form = new FormData();
      form.append("file", wav, `voice-${Date.now()}.wav`);
      const response = await fetch(`${apiBase}/api/chat/transcribe`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? "Не удалось распознать голос.");
      const text = chatTranscriptionResponseSchema.parse(data).text;
      if (transcriptionAttempt.current !== attempt) return;
      await sendMessage(text, true);
    } catch (cause) {
      if (transcriptionAttempt.current !== attempt) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Не удалось распознать голос.");
    } finally {
      if (transcriptionAttempt.current === attempt) {
        transcribingRef.current = false;
        if (requestController.current === controller) requestController.current = null;
        setTranscribing(false);
      }
    }
  }

  async function startRecording() {
    if (streaming || recording || transcribing || recordingStartPending.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Голосовой ввод не поддерживается этим браузером.");
      return;
    }

    setError("");
    const attempt = ++recordingAttempt.current;
    recordingStartPending.current = true;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recordingAttempt.current !== attempt) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      recordingStream.current = stream;
      recordingChunks.current = [];
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunks.current.push(event.data);
      };
      recorder.onerror = () => {
        if (mediaRecorder.current !== recorder) return;
        releaseRecording();
        setError("Во время записи произошла ошибка. Попробуйте ещё раз.");
      };
      recorder.onstop = () => {
        recorder.onerror = null;
        if (recordingStopTimer.current) clearTimeout(recordingStopTimer.current);
        recordingStopTimer.current = null;
        const audio = new Blob(recordingChunks.current, { type: recorder.mimeType || supportedType || "audio/webm" });
        mediaRecorder.current = null;
        recordingStream.current?.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
        recordingChunks.current = [];
        setRecording(false);
        if (audio.size === 0) {
          setError("Не удалось записать голос. Попробуйте ещё раз.");
          return;
        }
        void transcribeAudio(audio);
      };
      recorder.start();
      setRecording(true);
      recordingStopTimer.current = setTimeout(() => {
        if (mediaRecorder.current === recorder && recorder.state !== "inactive") recorder.stop();
      }, 60_000);
    } catch (cause) {
      if (recordingAttempt.current !== attempt) return;
      stream?.getTracks().forEach((track) => track.stop());
      recordingStream.current?.getTracks().forEach((track) => track.stop());
      recordingStream.current = null;
      mediaRecorder.current = null;
      setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Разрешите доступ к микрофону в браузере." : "Не удалось включить микрофон.");
    } finally {
      if (recordingAttempt.current === attempt) recordingStartPending.current = false;
    }
  }

  function stopRecording() {
    const recorder = mediaRecorder.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  async function sendMessage(text: string, fromVoice = false) {
    if (streaming || recording || streamTimer.current || (transcribing && !fromVoice)) return;
    const messageText = text.trim();
    if (!messageText) return;
    const attempt = ++chatAttempt.current;
    setError("");
    setStreaming(true);
    const sequence = ++nextId.current;
    const userId = `custom-user-${sequence}`;
    const assistantId = `stream-${sequence}`;
    activeAssistantId.current = assistantId;
    const history = [...messages, { id: userId, role: "user" as const, author: "Вы", time: "сейчас", text: messageText }];
    setMessages([...history, { id: assistantId, role: "assistant", author: "NIKASS", time: "сейчас", text: "" }]);
    const controller = new AbortController();
    requestController.current = controller;

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, text: content }) => ({ role, content })) }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? "Сервис консультанта временно недоступен.");
      const reply = chatResponseSchema.parse(data).reply;
      if (chatAttempt.current !== attempt) return;
      let visibleLength = 0;
      streamTimer.current = setInterval(() => {
        if (chatAttempt.current !== attempt) return;
        visibleLength = Math.min(visibleLength + 4, reply.length);
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: reply.slice(0, visibleLength) } : message));
        if (visibleLength === reply.length && streamTimer.current) {
          clearInterval(streamTimer.current);
          streamTimer.current = null;
          activeAssistantId.current = null;
          setStreaming(false);
        }
      }, 45);
    } catch (cause) {
      if (chatAttempt.current !== attempt) return;
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        activeAssistantId.current = null;
        setStreaming(false);
        return;
      }
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      activeAssistantId.current = null;
      setError(cause instanceof Error ? cause.message : "Сервис консультанта временно недоступен.");
      setStreaming(false);
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }

  return <MessageScroller.Provider defaultScrollPosition="last-anchor" scrollPreviousItemPeek={48}>
    <MessageScrollerPanel messages={messages} streaming={streaming} recording={recording} transcribing={transcribing} error={error} onReset={reset} onSend={sendMessage} onStartRecording={startRecording} onStopRecording={stopRecording} />
  </MessageScroller.Provider>;
}
