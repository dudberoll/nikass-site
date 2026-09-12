import { cartReviewRequestSchema, orderQuoteRequestSchema, orderQuoteResponseSchema, orderResultSchema, type CartReviewRequest, type OrderResult } from "@web-app-demo/contracts";
import { useEffect, useState, type SyntheticEvent } from "react";

import { readCart, saveCart } from "../lib/cart";

const STORAGE_KEY = "nikass-checkout";
const fields = [
  ["name", "Имя и фамилия", "text", "name", 100], ["phone", "Телефон", "tel", "tel", 30], ["email", "Email", "email", "email", 254],
  ["region", "Регион / область", "text", "address-level1", 100], ["city", "Город", "text", "address-level2", 100], ["street", "Улица", "text", "address-line1", 150],
  ["house", "Дом / корпус", "text", "off", 30], ["apartment", "Квартира / офис (необязательно)", "text", "address-line2", 30], ["postcode", "Почтовый индекс", "text", "postal-code", 6],
] as const;
type Quote = ReturnType<typeof orderQuoteResponseSchema.parse>;
type Initial = { cart: CartReviewRequest | null; quote: Quote | null; result: OrderResult | null; error: string };
type CheckoutProps = { apiBase: string; privacyUrl: string; termsUrl: string };
const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(minor / 100);

function readCheckout(): Initial {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    const quote = orderQuoteResponseSchema.safeParse(saved?.quote);
    if (quote.success) return { cart: cartReviewRequestSchema.parse(saved.cart), quote: quote.data, result: saved.sent ? { state: "submitting", orderNumber: null } : null, error: "" };
    const hash = new URLSearchParams(location.hash.slice(1)).get("cart");
    const local = readCart();
    if (local.error) throw new Error();
    const cart = hash ? JSON.parse(hash) : saved?.cart ?? { version: 1, items: local.items.map((item) => ({ slug: item.productSlug, sku: item.variantSku, quantity: item.quantity })) };
    return { cart: cartReviewRequestSchema.parse(cart), quote: null, result: null, error: "" };
  } catch { return { cart: null, quote: null, result: null, error: "Корзина недоступна или пуста. Вернитесь в каталог." }; }
}

function CheckoutClient({ apiBase, privacyUrl, termsUrl }: CheckoutProps) {
  const [initial] = useState(readCheckout);
  const [cart] = useState(initial.cart);
  const [quote, setQuote] = useState(initial.quote);
  const [result, setResult] = useState(initial.result);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false);

  async function request(path: string, body: unknown, schema: typeof orderResultSchema | typeof orderQuoteResponseSchema) {
    const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(data?.error?.message ?? "Сервис оформления временно недоступен."), { status: response.status });
    return schema.parse(data);
  }

  useEffect(() => {
    try {
      if (initial.quote && initial.result) void request("/api/orders/status", { checkoutToken: initial.quote.checkoutToken }, orderResultSchema).then((value) => setResult(value as OrderResult)).catch(() => setError("Не удалось восстановить статус заказа."));
      else if (initial.cart) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: initial.cart })); history.replaceState(null, "", location.pathname + location.search); }
    } catch { setError("Не удалось сохранить оформление в браузере."); }
  }, [initial]);

  async function review(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault(); setError(""); setErrors({});
    const data = new FormData(event.currentTarget);
    const nextDraft = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value)])); setDraft(nextDraft);
    const customer = { ...Object.fromEntries(data), consent: data.get("consent") === "on" } as Record<string, unknown>; delete customer.promoCode;
    const parsed = orderQuoteRequestSchema.safeParse({ cart, customer, promoCode: data.get("promoCode") ?? "" });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path.at(-1)), issue.message]))); return setError("Проверьте отмеченные поля."); }
    if (!privacyUrl || !termsUrl) return setError("Документы магазина ещё не опубликованы. Отправка заказа пока недоступна.");
    setBusy(true);
    try { const next = await request("/api/orders/quote", parsed.data, orderQuoteResponseSchema) as Quote; sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cart, quote: next, sent: false })); setQuote(next); setResult(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось проверить заказ."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!quote || busy) return; setBusy(true); setError(""); setResult({ state: "submitting", orderNumber: null });
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cart, quote, sent: true })); setResult(await request("/api/orders", { checkoutToken: quote.checkoutToken }, orderResultSchema) as OrderResult); }
    catch (cause) { const rejected = cause instanceof Error && "status" in cause && [400, 409].includes(Number(cause.status)); setResult({ state: rejected ? "rejected" : "uncertain", orderNumber: null }); setError(rejected && cause instanceof Error ? cause.message : "Ответ не получен. Не оформляйте заказ повторно — сначала проверьте статус."); }
    finally { setBusy(false); }
  }

  async function status() { if (!quote) return; setBusy(true); setError(""); try { setResult(await request("/api/orders/status", { checkoutToken: quote.checkoutToken }, orderResultSchema) as OrderResult); } catch { setError("Статус временно недоступен."); } finally { setBusy(false); } }
  function edit() { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cart })); setQuote(null); setResult(null); setError(""); } catch { setError("Не удалось сохранить корзину."); } }
  function newCart() { sessionStorage.removeItem(STORAGE_KEY); saveCart([]); location.assign("/catalog"); }

  if (!cart) return <div className="cart-empty"><h2>Корзина пуста</h2><p>{error}</p><a className="store-primary-button" href="/catalog">Перейти в каталог</a></div>;
  return <div className="checkout-shell">
    {error && <p className="checkout-error" role="alert">{error}</p>}
    {result?.state === "confirmed" ? <section className="checkout-result" aria-live="polite"><p className="store-eyebrow">ЗАКАЗ ОФОРМЛЕН</p><h2>Заказ №{result.orderNumber}</h2><p>Заказ ожидает обработки менеджером. Сохраните номер.</p><button className="store-primary-button" type="button" onClick={newCart}>Перейти к новой корзине</button></section>
      : result && result.state !== "quoted" ? <section className="checkout-result" aria-live="polite"><h2>{result.state === "rejected" ? "Нужно проверить заказ заново" : "Проверяем результат"}</h2><p>{result.state === "rejected" ? "Цена, наличие или условия изменились." : "Не оформляйте этот заказ повторно."}</p><button className="store-primary-button" type="button" disabled={busy} onClick={result.state === "rejected" ? edit : status}>{result.state === "rejected" ? "Проверить заново" : "Обновить статус"}</button></section>
      : quote ? <section className="checkout-result"><h2>Проверьте итоговую сумму</h2><ul className="checkout-total-list">{quote.totals.items.map((item) => <li key={item.sku}><span>{item.name} · {item.quantity} шт.</span><strong>{money(item.totalMinor)}</strong></li>)}</ul><div className="checkout-summary-line"><span>Скидка</span><strong>{money(quote.totals.discountMinor)}</strong></div><div className="checkout-summary-line checkout-summary-total"><span>Итого</span><strong>{money(quote.totals.totalMinor)}</strong></div><p>Расчёт действителен 15 минут.</p><div className="checkout-actions"><button className="store-primary-button" type="button" disabled={busy} onClick={submit}>{busy ? "Отправляем…" : "Подтвердить и оформить"}</button><button className="checkout-secondary-button" type="button" disabled={busy} onClick={edit}>Изменить данные</button></div></section>
      : <form className="checkout-form" onSubmit={review} noValidate><fieldset disabled={busy}><legend>Контакты и адрес доставки</legend><div className="checkout-fields">{fields.map(([name, label, type, autoComplete, maxLength]) => <div className="checkout-field" key={name}><label htmlFor={name}>{label}</label><div className={`checkout-field-control${errors[name] ? " has-error" : ""}`}><input id={name} name={name} type={type} autoComplete={autoComplete} maxLength={maxLength} defaultValue={draft[name] ?? ""} required={name !== "apartment"} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />{errors[name] && <p className="checkout-error" id={`${name}-error`}>{errors[name]}</p>}</div></div>)}</div><label htmlFor="comment">Комментарий к заказу</label><div className={`checkout-field-control checkout-field-control-textarea${errors.comment ? " has-error" : ""}`}><textarea id="comment" name="comment" maxLength={1000} required defaultValue={draft.comment ?? ""} aria-invalid={Boolean(errors.comment)} aria-describedby={errors.comment ? "comment-error" : undefined} />{errors.comment && <p className="checkout-error" id="comment-error">{errors.comment}</p>}</div><label htmlFor="promoCode">Промокод (если есть)</label><input id="promoCode" name="promoCode" maxLength={100} defaultValue={draft.promoCode ?? ""} /><label className="checkout-consent"><input type="checkbox" name="consent" required defaultChecked={draft.consent === "on"} /><span>Согласен с {termsUrl ? <a href={termsUrl} target="_blank" rel="noreferrer">условиями покупки</a> : "условиями покупки"} и {privacyUrl ? <a href={privacyUrl} target="_blank" rel="noreferrer">обработкой персональных данных</a> : "обработкой персональных данных"}.</span></label>{errors.consent && <p className="checkout-error">{errors.consent}</p>}<button className="store-primary-button" type="submit">{busy ? "Проверяем…" : "Проверить заказ и промокод"}</button></fieldset></form>}
  </div>;
}

export default function Checkout(props: CheckoutProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <CheckoutClient {...props} /> : <div className="cart-empty"><h2>Загружаем оформление…</h2></div>;
}
