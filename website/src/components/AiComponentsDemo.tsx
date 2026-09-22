import { useEffect, useRef, useState, type ReactElement } from "react";
import { chatResponseSchema, chatTranscriptionResponseSchema } from "@web-app-demo/contracts";

import { convertAudioToWav } from "../lib/audio";
import PromptInput from "./PromptInput";

type IconName = "analytics" | "edit" | "image" | "idea" | "sparkles";

export type ChatProduct = {
  slug: string;
  name: string;
  category: string;
  image: string;
  priceLabel: string;
  oldPriceLabel?: string;
};

const actions: Array<{ icon: IconName; label: string; prompt: string }> = [
  { icon: "idea", label: "Для дома", prompt: "Подбери мне портативную зарядную станцию для дома на случай отключения электричества. Сначала уточни, какую технику нужно запитать, её мощность и на сколько часов должна хватить станция, а затем предложи подходящие варианты из каталога." },
  { icon: "image", label: "Для дачи", prompt: "Подбери мне оборудование для дачи: портативную зарядную станцию для освещения, роутера и другой техники. Уточни, какие устройства я буду использовать, их мощность и нужное время работы, затем предложи подходящие варианты из каталога." },
  { icon: "sparkles", label: "В поход", prompt: "Подбери мне компактное оборудование для походов и кемпинга: зарядную станцию или POWERBANK для телефона, ноутбука и другой техники. Уточни, что я буду заряжать и на сколько дней нужен запас энергии." },
  { icon: "analytics", label: "Промышленное оборудование", prompt: "Подбери мне оборудование для резервного питания промышленной техники. Сначала уточни список устройств, их рабочую и пусковую мощность, нужное время автономной работы и условия использования, а затем предложи подходящее решение из каталога." },
  { icon: "edit", label: "Доставка и возврат", prompt: "Расскажи подробно об условиях доставки, сроках, стоимости и возврате товаров NIKASS." },
];

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const catalogPathPattern = /(?:https?:\/\/[^)\s/]+)?\/catalog\/([a-z0-9-]+)\/?/gi;
const catalogLinkLinePattern = /^\s*(?:[-*+•]\s*)?(?:\[[^\]\n]+\]\()?(?:https?:\/\/[^)\s/]+)?\/catalog\/[a-z0-9-]+\/?\)?\s*$/i;

export function extractCatalogProductSlugs(text: string) {
  return [...new Set([...text.matchAll(catalogPathPattern)].map((match) => match[1]).filter((slug): slug is string => Boolean(slug)))];
}

export function removeCatalogProductLinkLines(text: string) {
  return text.split(/\r?\n/).filter((line) => !catalogLinkLinePattern.test(line)).join("\n").trim();
}

function ProductRecommendations({ text, products }: { text: string; products: readonly ChatProduct[] }) {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const recommended = extractCatalogProductSlugs(text)
    .map((slug) => productsBySlug.get(slug))
    .filter((product): product is ChatProduct => Boolean(product))
    .slice(0, 3);

  if (recommended.length === 0) return null;

  return <div className="ai-recommended-products" aria-label="Рекомендованные товары">
    {recommended.map((product) => <a className="orbea-bestseller-card ai-recommended-product" href={`/catalog/${product.slug}`} key={product.slug}>
      <div className="orbea-bestseller-image"><img src={product.image} alt={product.name} loading="lazy" /></div>
      <div className="orbea-bestseller-copy">
        <p>{product.category}</p>
        <h3>{product.name}</h3>
        <div><strong>{product.priceLabel}</strong>{product.oldPriceLabel && <del>{product.oldPriceLabel}</del>}</div>
      </div>
    </a>)}
  </div>;
}

function Icon({ name }: { name: IconName }) {
  const paths = {
    analytics: <><path d="M5 19V9m7 10V5m7 14v-7" /><path d="M3 19h18" /></>,
    edit: <><path d="m4 16 9.5-9.5 4 4L8 20H4z" /><path d="m12 8 4 4M14 20h6" /></>,
    image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.2" /><path d="m5 17 4-4 3 3 2-2 5 4" /></>,
    idea: <><path d="M9 18h6M10 22h4" /><path d="M8.5 14.5A6 6 0 1 1 16 14c-.8.6-1 1.3-1 2H9.5c0-.6-.3-1.1-1-1.5Z" /></>,
    sparkles: <><path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3z" /><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6z" /></>,
  } satisfies Record<IconName, ReactElement>;

  return <svg aria-hidden="true" className="ai-components-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AssistantCard({ apiBase, products }: { apiBase: string; products: readonly ChatProduct[] }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const nextMessageId = useRef(0);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const activeAssistantId = useRef<string | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (streamTimer.current) clearInterval(streamTimer.current);
    requestController.current?.abort();
  }, []);

  useEffect(() => {
    const handleChatClose = () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
      streamTimer.current = null;
      requestController.current?.abort();
      requestController.current = null;
      if (activeAssistantId.current) {
        const assistantId = activeAssistantId.current;
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        activeAssistantId.current = null;
      }
      setStreaming(false);
      setTranscribing(false);
    };
    const handleChatReset = () => {
      handleChatClose();
      nextMessageId.current = 0;
      setMessages([]);
      setDraft("");
      setError("");
    };
    document.addEventListener("nikass:chat-close", handleChatClose);
    document.addEventListener("nikass:chat-reset", handleChatReset);
    return () => {
      document.removeEventListener("nikass:chat-close", handleChatClose);
      document.removeEventListener("nikass:chat-reset", handleChatReset);
    };
  }, []);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendPrompt(value: string) {
    const text = value.trim();
    if (!text || streaming) return;

    setError("");
    setDraft("");
    setStreaming(true);
    const sequence = ++nextMessageId.current;
    const userMessage = { id: `user-${sequence}`, role: "user" as const, text };
    const assistantId = `assistant-${sequence}`;
    activeAssistantId.current = assistantId;
    const history = [...messages, userMessage];
    setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);

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
      let visibleLength = 0;
      streamTimer.current = setInterval(() => {
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

  async function transcribeAudio(audio: Blob) {
    setError("");
    setTranscribing(true);
    const controller = new AbortController();
    requestController.current = controller;

    try {
      const wav = await convertAudioToWav(audio);
      const form = new FormData();
      form.append("file", wav, `voice-${Date.now()}.wav`);
      const response = await fetch(`${apiBase}/api/chat/transcribe`, { method: "POST", body: form, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? "Не удалось распознать голос.");
      const text = chatTranscriptionResponseSchema.parse(data).text;
      setTranscribing(false);
      if (requestController.current === controller) requestController.current = null;
      await sendPrompt(text);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Не удалось распознать голос.");
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setTranscribing(false);
    }
  }

  return <section className="ai-assistant-card" aria-labelledby="ai-assistant-card-title">
    {messages.length === 0 ? <div className="ai-assistant-card-content">
      <div className="ai-assistant-card-mark"><img className="ai-assistant-card-logo" src="/assets/images/nikass-smart-selection-logo.png" alt="NIKASS smart selection" /></div>
      <p className="ai-assistant-card-greeting">Здравствуйте! Я консультант NIKASS</p>
      <h1 id="ai-assistant-card-title">Помогу подобрать оборудование под Вашу задачу</h1>
      <p className="ai-assistant-card-description">Расскажите, что нужно запитать: дом, технику или автомобиль. Отвечу на вопросы по оборудованию, доставке и возврату.</p>
      <div className="ai-assistant-card-actions">
        {actions.map((action) => <button key={action.label} type="button" onClick={() => void sendPrompt(action.prompt)}><Icon name={action.icon} />{action.label}</button>)}
      </div>
    </div> : <div ref={conversationRef} className="ai-assistant-card-conversation" aria-live="polite" aria-busy={streaming || transcribing}>
      {messages.map((message) => {
        const visibleText = message.role === "assistant" ? removeCatalogProductLinkLines(message.text) : message.text;
        return <article key={message.id} className={`ai-chat-message is-${message.role}`}>
          <div className="ai-chat-message-avatar" aria-hidden="true">{message.role === "assistant" ? "N" : "Вы"}</div>
          <div className="ai-chat-message-content">
            {(visibleText || !message.text) && <div className="ai-chat-bubble">{visibleText || "Печатает…"}</div>}
            {message.role === "assistant" && <ProductRecommendations text={message.text} products={products} />}
          </div>
        </article>;
      })}
    </div>}
    {error && <p className="ai-chat-error" role="alert">{error}</p>}
    <div className="ai-assistant-card-composer ai-assistant-card-prompt">
      <PromptInput value={draft} onChange={setDraft} onSubmit={(value) => void sendPrompt(value)} onVoiceInput={transcribeAudio} disabled={streaming || transcribing} placeholder="Что нужно запитать?" />
    </div>
  </section>;
}

export default function AiComponentsDemo({ apiBase, products }: { apiBase: string; products: readonly ChatProduct[] }) {
  return <div className="ai-components-grid">
    <AssistantCard apiBase={apiBase} products={products} />
    <div className="ai-prompt-stage"><PromptInput /></div>
  </div>;
}
