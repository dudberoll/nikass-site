import { Call02Icon, TelegramIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { managerContactRequestSchema, managerContactResponseSchema, restockChannelLabels, type RestockChannel } from "@web-app-demo/contracts";
import { useId, useRef, useState, type SyntheticEvent } from "react";
import type { Product, ProductVariant } from "../data/catalog";

const channels = ["phone", "telegram", "max", "whatsapp"] as const;
const icons = { phone: Call02Icon, telegram: TelegramIcon, whatsapp: WhatsappIcon };

export default function ManagerContactDialog({ product, variant, large = false }: { product: Product; variant: ProductVariant; large?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef("");
  const id = useId();
  const [channel, setChannel] = useState<RestockChannel>("phone");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const privacyUrl = import.meta.env.PUBLIC_PRIVACY_URL || "";
  const apiBase = (import.meta.env.PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const phone = channel === "phone" || channel === "whatsapp";

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || sent) return;
    if (!privacyUrl) return setError("Приём запросов пока недоступен. Попробуйте позже.");
    const data = new FormData(event.currentTarget);
    requestId.current ||= crypto.randomUUID();
    const parsed = managerContactRequestSchema.safeParse({
      requestId: requestId.current, slug: variant.sourceSlug ?? product.slug, sku: variant.sku,
      channel, contact, consent: data.get("consent") === "on", website: data.get("website") || "",
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message || "Проверьте контакт.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/catalog/manager-contact`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15_000) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 503) requestId.current = "";
        setError(response.status === 429 ? "Слишком много попыток. Подождите минуту и попробуйте снова."
          : body?.error?.message || "Не удалось передать запрос менеджеру. Попробуйте ещё раз.");
        return;
      }
      const result = managerContactResponseSchema.safeParse(body);
      if (!result.success || result.data.requestId !== requestId.current) throw new Error("Invalid response");
      setSent(true);
      setContact("");
    } catch {
      setError("Не удалось подтвердить отправку. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className={`store-add-button manager-contact-trigger${large ? " store-add-button-large" : ""}`} type="button" aria-haspopup="dialog" aria-controls={`${id}-dialog`}
      onClick={() => dialog.current?.showModal()}>Заказать у менеджера</button>
    <dialog ref={dialog} id={`${id}-dialog`} className="restock-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <button className="restock-close" type="button" aria-label="Закрыть окно" disabled={busy} onClick={() => dialog.current?.close()}>×</button>
      <h2 id={`${id}-title`}>Заказать у менеджера</h2>
      <p id={`${id}-description`} className="restock-product">{product.name}<br />{variant.label}</p>
      {sent ? <div role="status"><p>Запрос передан менеджеру. Он свяжется с вами выбранным способом.</p>
        <button className="store-add-button" type="button" onClick={() => dialog.current?.close()}>Готово</button></div>
        : <form onSubmit={submit} noValidate>
          <p className="restock-hint">Как менеджеру связаться с вами?</p>
          <fieldset disabled={busy}>
            <legend className="sr-only">Способ связи</legend>
            <div className="restock-channels">{channels.map((value) => <button type="button" aria-pressed={channel === value}
              onClick={() => { setChannel(value); setContact(""); setError(""); requestId.current = ""; }} key={value}>
              {value === "max" ? <span className="restock-max-icon" aria-hidden="true">M</span> : <HugeiconsIcon icon={icons[value]} size={24} aria-hidden="true" />}
              <span>{restockChannelLabels[value]}</span></button>)}</div>
            <label className="restock-contact" htmlFor={`${id}-contact`}>{phone ? "Номер телефона" : channel === "telegram" ? "Никнейм Telegram" : "Никнейм, ссылка на профиль или номер телефона MAX"}
              <input id={`${id}-contact`} name="contact" type={phone ? "tel" : "text"} autoComplete={phone ? "tel" : "off"} maxLength={150} required
                placeholder={phone ? "+7 999 123-45-67" : channel === "telegram" ? "@username" : "+7 999 123-45-67, @username или https://max.ru/…"}
                value={contact} onChange={(event) => { setContact(event.target.value); setError(""); requestId.current = ""; }} aria-describedby={`${id}-error`} />
            </label>
            <div className="restock-trap" aria-hidden="true"><label>Ваш сайт<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {privacyUrl && <label className="restock-consent"><input type="checkbox" name="consent" required />
              <span>Даю отдельное согласие на обработку контакта, чтобы менеджер ответил по этому товару. <a href="/personal-data-consent" target="_blank" rel="noreferrer">Текст согласия</a> · <a href="/privacy-policy" target="_blank" rel="noreferrer">Политика конфиденциальности</a></span></label>}
            <p className="restock-error" id={`${id}-error`} role="alert">{error}</p>
            {!privacyUrl && <p className="restock-hint">Приём запросов пока недоступен. Попробуйте позже.</p>}
            <button className="store-add-button" type="submit" disabled={!privacyUrl}>{busy ? "Отправляем…" : "Отправить запрос"}</button>
          </fieldset>
        </form>}
    </dialog>
  </>;
}
