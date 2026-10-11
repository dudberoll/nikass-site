import { cartReviewRequestSchema, orderCustomerContactSchema, orderQuoteRequestSchema, orderQuoteResponseSchema, paymentStartResponseSchema, paymentStatusResponseSchema, type CartReviewRequest, type CdekDeliveryPoint, type CdekOrderDelivery, type CdekOrderDeliveryQuote } from "@web-app-demo/contracts";
import { useEffect, useState, type MouseEvent, type SyntheticEvent } from "react";

import { clearCartIfUnchanged, readCart } from "../lib/cart";
import { clearCheckoutSnapshot, readCheckoutSnapshot, readSavedPayments, requestCheckout, saveCheckoutSnapshot } from "../lib/checkout-session";
import CdekSandbox from "./CdekSandbox";

const contactFields = [["name", "Имя и фамилия", "text", "name", 100], ["phone", "Телефон", "tel", "tel", 30], ["email", "Email", "email", "email", 254]] as const;
const pickupDetails = { region: "Москва", city: "Москва", street: "Электролитный проезд", house: "3 стр. 2", apartment: "", postcode: "115230" } as const;
type DeliveryMethod = "delivery" | "pickup";
const russianDayPluralRules = new Intl.PluralRules("ru");
const contactSchema = orderCustomerContactSchema;
const customerSnapshotSchema = contactSchema.strip();
type Quote = ReturnType<typeof orderQuoteResponseSchema.parse>;
type Payment = ReturnType<typeof paymentStatusResponseSchema.parse>;
type CustomerSnapshot = ReturnType<typeof customerSnapshotSchema.parse>;
type CdekDelivery = CdekOrderDelivery | null;
type CdekDeliverySummary = CdekOrderDeliveryQuote | undefined;
type CourierAddress = Extract<CdekOrderDelivery, { mode: "courier" }>["address"];
type Initial = { cart: CartReviewRequest | null; cartRevision?: string; quote: Quote | null; paymentId: string | null; attemptId?: string; error: string };
type CheckoutProps = { apiBase: string; privacyUrl: string; termsUrl: string; yandexSuggestApiKey: string; cdekYandexApiKey: string; yandexGeocoderApiKey: string };
const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(minor / 100);

function PaymentDetails({ quote, customer, courierAddress }: { quote: Quote; customer: CustomerSnapshot | null; courierAddress?: CourierAddress }) {
  const [name, ...surname] = customer?.name.trim().split(/\s+/) ?? [];
  return <>
    {customer && <dl className="checkout-fields checkout-customer">
      <div><dt>Имя</dt><dd>{name}</dd></div>
      <div><dt>Фамилия</dt><dd>{surname.join(" ")}</dd></div>
      <div><dt>Телефон</dt><dd>{customer.phone}</dd></div>
      <div><dt>E-mail</dt><dd>{customer.email}</dd></div>
    </dl>}
    <p className="checkout-details-label">Состав заказа</p>
    <ul className="checkout-total-list">{quote.totals.items.map((item) => <li key={item.sku}><span>{item.name} · {item.quantity} шт.</span><strong>{money(item.totalMinor)}</strong></li>)}</ul>
    <CdekDeliveryDetails point={quote.deliveryPoint} delivery={quote.cdekDelivery} address={courierAddress} />
    <div className="checkout-summary-line checkout-summary-total"><span>К оплате онлайн</span><strong>{money(quote.totals.totalMinor)}</strong></div>
  </>;
}

function cdekDeliveryLabel(mode: "office" | "courier", tariffName: string | null) {
  const kind = /^Экспресс(?:\s|$)/i.test(tariffName ?? "") ? "Экспресс-доставка" : "Доставка";
  const destination = mode === "office" ? "до ПВЗ" : "курьером";
  return `${kind} ${destination}`;
}

function cdekDeliveryPeriod(periodMin: number | null, periodMax: number | null) {
  if (periodMin === null || periodMax === null) return "";
  const count = periodMin === periodMax ? `${periodMin}` : `${periodMin}–${periodMax}`;
  const plural = russianDayPluralRules.select(periodMax);
  const unit = plural === "one" ? "день" : plural === "few" ? "дня" : "дней";
  return `${count} ${unit}`;
}

function CdekDeliveryTariffLine({ mode, tariff }: { mode: "office" | "courier"; tariff: CdekOrderDeliveryQuote["tariff"] }) {
  const period = cdekDeliveryPeriod(tariff.periodMin, tariff.periodMax);
  return <>
    <span className="checkout-cdek-delivery-label">{cdekDeliveryLabel(mode, tariff.tariffName)}{period && <span className="checkout-cdek-delivery-period"><span aria-hidden="true">·</span><svg className="checkout-cdek-clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span>{period}</span></span>}</span>
    <strong className="checkout-cdek-delivery-price">{tariff.shippingMinor === null ? "Подтвердит менеджер" : `${money(tariff.shippingMinor)} — Оплата при получении`}</strong>
  </>;
}

function CdekDeliveryDetails({ point, delivery, address }: { point: CdekDeliveryPoint | undefined; delivery?: CdekDeliverySummary; address?: CourierAddress }) {
  if (delivery) {
    const location = address ? [...new Set([address.postcode, address.region, address.city].map((part) => part.trim()).filter(Boolean))].join(", ") : "";
    const route = delivery.mode === "office"
      ? `ПВЗ СДЭК ${delivery.point.code} — ${delivery.point.city}, ${delivery.point.address}`
      : address
        ? <>Курьер — {location && `${location}, `}<span className="checkout-cdek-street-house">{address.street}, д. {address.house}{address.apartment ? `, кв. ${address.apartment}` : ""}</span></>
        : "Курьер";
    const tariff = delivery.tariff;
    return <section className="checkout-cdek-summary" aria-label="Отдельная оплата доставки СДЭК">
      <CdekDeliveryTariffLine mode={delivery.mode} tariff={tariff} />
      <p>{route}</p>
    </section>;
  }
  if (!point) return null;
  return <section className="checkout-cdek-summary" aria-label="Отдельная оплата доставки СДЭК">
    <CdekDeliveryTariffLine mode="office" tariff={point} />
    <p>ПВЗ СДЭК {point.code} — {point.city}, {point.address}</p>
  </section>;
}

function CheckoutNotesAndConsent({ draft, errors, termsUrl }: { draft: Record<string, string>; errors: Record<string, string>; termsUrl: string }) {
  return <>
    <label htmlFor="comment">Комментарий к заказу</label><div className={`checkout-field-control checkout-field-control-textarea${errors.comment ? " has-error" : ""}`}><textarea id="comment" name="comment" maxLength={1000} defaultValue={draft.comment ?? ""} aria-invalid={Boolean(errors.comment)} aria-describedby={errors.comment ? "comment-error" : undefined} />{errors.comment && <p className="checkout-error" id="comment-error">{errors.comment}</p>}</div>
    <label htmlFor="promoCode">Промокод (если есть)</label><input id="promoCode" name="promoCode" maxLength={100} defaultValue={draft.promoCode ?? ""} />
    <label className="checkout-consent" htmlFor="termsAccepted"><input id="termsAccepted" type="checkbox" name="termsAccepted" required defaultChecked={draft.termsAccepted === "on"} aria-invalid={Boolean(errors.termsAccepted)} aria-describedby={errors.termsAccepted ? "termsAccepted-error" : undefined} /><span className="checkout-consent-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5" /></svg></span><span>Принимаю {termsUrl ? <a href={termsUrl} target="_blank" rel="noreferrer">условия покупки</a> : "условия покупки"}.</span></label>{errors.termsAccepted && <p className="checkout-error" id="termsAccepted-error">{errors.termsAccepted}</p>}
    <label className="checkout-consent" htmlFor="consent"><input id="consent" type="checkbox" name="consent" required defaultChecked={draft.consent === "on"} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} /><span className="checkout-consent-box" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5" /></svg></span><span>Даю отдельное <a href="/personal-data-consent" target="_blank" rel="noreferrer">согласие на обработку персональных данных</a>.</span></label>{errors.consent && <p className="checkout-error" id="consent-error">{errors.consent}</p>}
  </>;
}

export function paymentResultMessage(payment: Payment) {
  if (payment.fulfillmentState === "skipped") return "Оплата подтверждена, но заказ не оформлен. Свяжитесь с нами для уточнения дальнейших действий.";
  if (payment.fulfillmentState === "uncertain") return "Оплата подтверждена, но оформление заказа требует проверки менеджером.";
  return payment.orderNumber ? `Номер заказа: ${payment.orderNumber}` : "Оплата подтверждена, заказ передан на оформление.";
}

function readCheckout(): Initial {
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const attempt = params.get("attempt");
    const saved = attempt ? readSavedPayments().find((payment) => payment.attemptId === attempt) : readCheckoutSnapshot();
    if (attempt && !saved) return { cart: null, quote: null, paymentId: null, error: "Эта оплата не сохранена в текущей вкладке. Вернитесь в корзину или обратитесь в магазин для проверки оплаты." };
    const hash = params.get("cart");
    // A handoff from the basket always starts a separate checkout, even with an older payment saved.
    if (hash) {
      const cart = cartReviewRequestSchema.parse(JSON.parse(hash));
      const local = readCart();
      if (local.error) throw new Error();
      const matches = local.items.length === cart.items.length && local.items.every((line) => cart.items.some((item) => item.slug === line.productSlug && item.sku === line.variantSku && item.quantity === line.quantity));
      return { cart, ...(matches && local.revision ? { cartRevision: local.revision } : {}), quote: null, paymentId: null, error: "" };
    }
    if (saved?.quote) return { cart: saved.cart, cartRevision: saved.cartRevision, quote: saved.quote, paymentId: saved.paymentId ?? null, attemptId: saved.attemptId, error: "" };
    const local = readCart();
    if (local.error) throw new Error();
    const cart = { version: 1, items: local.items.map((item) => ({ slug: item.productSlug, sku: item.variantSku, quantity: item.quantity })) };
    const current = cartReviewRequestSchema.safeParse(cart);
    if (current.success) return { cart: current.data, cartRevision: local.revision, quote: null, paymentId: null, error: "" };
    return { cart: cartReviewRequestSchema.parse(saved?.cart), cartRevision: saved?.cartRevision, quote: null, paymentId: null, error: "" };
  } catch { return { cart: null, quote: null, paymentId: null, error: "Корзина недоступна или пуста. Вернитесь в каталог." }; }
}

function CheckoutClient({ apiBase, privacyUrl, termsUrl, yandexSuggestApiKey, cdekYandexApiKey, yandexGeocoderApiKey }: CheckoutProps) {
  const [initial] = useState(readCheckout);
  const [cart] = useState(initial.cart);
  const [quote, setQuote] = useState(initial.quote);
  const [customer, setCustomer] = useState<CustomerSnapshot | null>(null);
  const [paymentId, setPaymentId] = useState(initial.paymentId);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [cdekDelivery, setCdekDelivery] = useState<CdekDelivery>(null);

  useEffect(() => {
    try {
      // Rewrite legacy snapshots too: contacts and addresses belong only in form memory and the backend.
      if (initial.cart) {
        saveCheckoutSnapshot({ cart: initial.cart, cartRevision: initial.cartRevision,
          ...(initial.quote ? { quote: initial.quote } : {}), ...(initial.paymentId ? { paymentId: initial.paymentId } : {}),
          ...(initial.attemptId ? { attemptId: initial.attemptId } : {}) });
        history.replaceState(null, "", location.pathname + location.search);
      }
      if (initial.paymentId) void refreshPayment(initial.paymentId);
    } catch { setError("Не удалось сохранить оформление в браузере."); }
  }, [initial]);

  function showIssues(issues: Array<{ path: PropertyKey[]; message: string }>, values: Record<string, unknown>) {
    const nextErrors = Object.fromEntries(issues.map((issue) => {
      const name = String(issue.path.at(-1));
      const value = values[name];
      return [name, value == null || (typeof value === "string" && !value.trim()) ? "Заполните поле" : issue.message];
    }));
    const first = String(issues[0]?.path.at(-1) ?? "");
    setErrors(nextErrors);
    setError("Проверьте отмеченные поля.");
    const nextStep = contactFields.some(([name]) => name === first) ? 1 : first === "deliveryMethod" ? 2 : cdekDelivery ? 4 : 3;
    setStep(nextStep);
    window.setTimeout(() => document.getElementById(first)?.focus(), 0);
  }

  function next(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    setError("");
    const data = new FormData(form);
    const parsed = contactSchema.safeParse(Object.fromEntries(contactFields.map(([name]) => [name, data.get(name)])));
    if (!parsed.success) return showIssues(parsed.error.issues, Object.fromEntries(contactFields.map(([name]) => [name, data.get(name)])));
    setDraft((current) => ({ ...current, ...Object.fromEntries(contactFields.map(([name]) => [name, String(data.get(name) ?? "")])) }));
    setErrors({});
    setStep(2);
    window.setTimeout(() => document.getElementById("checkout-step-2-title")?.focus(), 0);
  }

  function nextDelivery() {
    setError("");
    setErrors({});
    if (deliveryMethod === "pickup") setCdekDelivery(null);
    setStep(3);
    window.setTimeout(() => document.getElementById(deliveryMethod === "pickup" ? "checkout-step-3-title" : "cdek-delivery-title")?.focus(), 0);
  }

  function continueCdek(delivery: CdekOrderDelivery) {
    setCdekDelivery(delivery);
    setError("");
    setErrors({});
    setStep(4);
    window.setTimeout(() => document.getElementById("checkout-order-details")?.focus(), 0);
  }

  async function review(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault(); setError(""); setErrors({});
    const data = new FormData(event.currentTarget);
    const nextDraft = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value)])); setDraft((current) => ({ ...current, ...nextDraft }));
    const termsAccepted = data.get("termsAccepted") === "on";
    const contacts = Object.fromEntries(contactFields.map(([name]) => [name, draft[name] ?? ""]));
    const customer = { ...contacts, ...Object.fromEntries(data), deliveryMethod: data.get("deliveryMethod") ?? deliveryMethod, consent: data.get("consent") === "on" } as Record<string, unknown>;
    delete customer.promoCode;
    delete customer.termsAccepted;
    if (cdekDelivery) customer.cdekDelivery = cdekDelivery;
    if (!termsAccepted) {
      setErrors({ termsAccepted: "Подтвердите принятие условий покупки." });
      setError("Подтвердите принятие условий покупки.");
      window.setTimeout(() => document.getElementById("termsAccepted")?.focus(), 0);
      return;
    }
    const parsed = orderQuoteRequestSchema.safeParse({ cart, customer, promoCode: data.get("promoCode") ?? "" });
    if (!parsed.success) return showIssues(parsed.error.issues, customer);
    if (!privacyUrl || !termsUrl) return setError("Документы магазина ещё не опубликованы. Отправка заказа пока недоступна.");
    setBusy(true);
    try { const next = await requestCheckout(apiBase, "/api/orders/quote", parsed.data, orderQuoteResponseSchema); const snapshot = customerSnapshotSchema.parse(parsed.data.customer); saveCheckoutSnapshot({ cart: parsed.data.cart, cartRevision: initial.cartRevision, quote: next }); setQuote(next); setCustomer(snapshot); setPaymentId(null); setPayment(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось проверить заказ."); }
    finally { setBusy(false); }
  }

  async function startPayment() {
    if (!cart || !quote || busy) return;
    setBusy(true); setError("");
    try {
      const next = await requestCheckout(apiBase, "/api/orders/payment", { checkoutToken: quote.checkoutToken }, paymentStartResponseSchema);
      saveCheckoutSnapshot({ cart, cartRevision: initial.cartRevision, quote, paymentId: next.paymentId, ...(next.attemptId ? { attemptId: next.attemptId } : {}) });
      setPaymentId(next.paymentId);
      location.assign(next.confirmationUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось открыть оплату."); setBusy(false); }
  }

  async function refreshPayment(id = paymentId) {
    if (!id || busy) return;
    setBusy(true); setError("");
    setConfirmationUrl(null);
    try {
      const status = await requestCheckout(apiBase, "/api/orders/payment/status", { paymentId: id }, paymentStatusResponseSchema);
      setPayment(status);
      if (status.paymentState !== "pending" || !quote) return;
      const existing = await requestCheckout(apiBase, "/api/orders/payment", { checkoutToken: quote.checkoutToken }, paymentStartResponseSchema);
      if (existing.paymentId !== id) throw new Error("Сервис вернул другую оплату. Обновите страницу.");
      setConfirmationUrl(existing.confirmationUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Статус оплаты временно недоступен."); }
    finally { setBusy(false); }
  }
  function edit() { try { if (!cart) return; saveCheckoutSnapshot({ cart, cartRevision: initial.cartRevision }); setQuote(null); setCustomer(null); setPaymentId(null); setPayment(null); setError(""); } catch { setError("Не удалось сохранить корзину."); } }
  function newCart() {
    try {
      const local = clearCartIfUnchanged(initial.cartRevision);
      if (local.error) throw new Error();
      clearCheckoutSnapshot();
      location.assign(local.items.length ? "/cart" : "/catalog");
    } catch { setError("Не удалось открыть корзину. Проверьте доступ к хранилищу браузера."); }
  }
  if (!cart) return <div className="cart-empty"><h2>Оформление недоступно</h2><p>{error}</p><a className="store-primary-button" href="/cart">Вернуться в корзину</a></div>;
  return <div className="checkout-shell">
    {error && <p className="checkout-error" role="alert">{error}</p>}
    {payment?.paymentState === "succeeded" ? <section className="checkout-result" aria-live="polite"><p className="store-eyebrow">ОПЛАТА ПРОШЛА</p><h2>Успешная оплата</h2>{payment.fulfillmentState !== "skipped" && <p>Менеджер свяжется с вами в течение часа в рабочее время, чтобы подтвердить все данные и заказ</p>}<PaymentDetails quote={quote!} customer={customer} /><p>{paymentResultMessage(payment)}</p><button className="store-primary-button" type="button" onClick={newCart}>Перейти к новой корзине</button></section>
      : payment?.paymentState === "canceled" ? <section className="checkout-result" aria-live="polite"><h2>Оплата отменена</h2><p>Заказ не оформлен. Вы можете вернуться к данным и повторить попытку.</p><button className="store-primary-button" type="button" onClick={edit}>Вернуться к заказу</button></section>
      : paymentId ? <section className="checkout-result" aria-live="polite"><h2>Ожидает оплаты</h2><p>Платёж ещё не подтверждён. Мы ожидаем оплату через {payment?.paymentState === "pending" && confirmationUrl ? <a href={confirmationUrl} rel="noreferrer">YooKassa</a> : "YooKassa"}.</p><PaymentDetails quote={quote!} customer={customer} /><button className="store-primary-button" type="button" disabled={busy} onClick={() => refreshPayment()}>{busy ? "Проверяем…" : "Обновить статус"}</button></section>
      : quote ? <section className="checkout-result"><h2>Проверьте итоговую сумму</h2><ul className="checkout-total-list">{quote.totals.items.map((item) => <li key={item.sku}><span>{item.name} · {item.quantity} шт.</span><strong>{money(item.totalMinor)}</strong></li>)}</ul><div className="checkout-summary-line"><span>Скидка</span><strong>{money(quote.totals.discountMinor)}</strong></div><CdekDeliveryDetails point={quote.deliveryPoint} delivery={quote.cdekDelivery} address={cdekDelivery?.mode === "courier" ? cdekDelivery.address : undefined} /><div className="checkout-summary-line checkout-summary-total"><span>К оплате онлайн</span><strong>{money(quote.totals.totalMinor)}</strong></div><div className="checkout-actions"><button className="store-primary-button" type="button" disabled={busy} onClick={startPayment}>{busy ? "Открываем оплату…" : "Перейти к оплате"}</button><button className="checkout-secondary-button" type="button" disabled={busy} onClick={edit}>Изменить данные</button></div></section>
      : deliveryMethod === "delivery" && step >= 3 ? <div className={step === 3 ? "checkout-cdek-flow" : "checkout-form"}>
        {step === 3 && <div className="checkout-actions"><button className="checkout-secondary-button" type="button" onClick={() => { setStep(2); window.setTimeout(() => document.getElementById("checkout-step-2-title")?.focus(), 0); }}>Назад</button></div>}
        <div hidden={step !== 3}>
          <CdekSandbox apiBase={apiBase} cdekYandexApiKey={cdekYandexApiKey} yandexGeocoderApiKey={yandexGeocoderApiKey} yandexSuggestApiKey={yandexSuggestApiKey} checkoutCart={cart} onContinue={continueCdek} />
        </div>
        {step === 4 && cdekDelivery && <form onSubmit={review} onChange={(event) => {
          const form = event.currentTarget;
          const values = Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]));
          values.termsAccepted = form.querySelector<HTMLInputElement>('[name="termsAccepted"]')?.checked ? "on" : "";
          values.consent = form.querySelector<HTMLInputElement>('[name="consent"]')?.checked ? "on" : "";
          setDraft((current) => ({ ...current, ...values }));
        }} noValidate>
          <fieldset disabled={busy} aria-labelledby="checkout-order-details">
            <legend id="checkout-order-details" className="sr-only" tabIndex={-1}>Ваш заказ</legend>
            <input type="hidden" name="deliveryMethod" value="delivery" />
            <CdekDeliveryDetails point={undefined} delivery={cdekDelivery} address={cdekDelivery.mode === "courier" ? cdekDelivery.address : undefined} />
            <CheckoutNotesAndConsent draft={draft} errors={errors} termsUrl={termsUrl} />
            <div className="checkout-actions">
              <button className="checkout-secondary-button" type="button" onClick={() => setStep(3)}>Назад</button>
              <button className="store-primary-button" type="submit">{busy ? "Переходим к оплате…" : "Перейти к оплате"}</button>
            </div>
          </fieldset>
        </form>}
      </div>
      : <form className="checkout-form" onSubmit={review} noValidate>
        <ol className="checkout-steps" aria-label="Шаги оформления"><li className={step === 1 ? "is-active" : "is-complete"} aria-current={step === 1 ? "step" : undefined}><span>1</span>Личные данные</li><li className={step === 2 ? "is-active" : step === 3 ? "is-complete" : ""} aria-current={step === 2 ? "step" : undefined}><span>2</span>Способ доставки</li><li className={step === 3 ? "is-active" : ""} aria-current={step === 3 ? "step" : undefined}><span>3</span>Адрес</li></ol>
        <fieldset disabled={busy} hidden={step !== 1}><legend id="checkout-step-1-title" tabIndex={-1}>Личные данные</legend><div className="checkout-fields checkout-fields-personal">{contactFields.map(([name, label, type, autoComplete, maxLength]) => <div className={"checkout-field" + (name === "name" ? " checkout-field-wide" : "")} key={name}><label className="sr-only" htmlFor={name}>{label}</label><div className={"checkout-field-control" + (errors[name] ? " has-error" : "")}><input id={name} name={name} type={type} autoComplete={autoComplete} maxLength={maxLength} defaultValue={draft[name] ?? ""} placeholder={label} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? name + "-error" : undefined} />{errors[name] && <p className="checkout-error" id={name + "-error"}>{errors[name]}</p>}</div></div>)}</div><div className="checkout-actions"><button className="store-primary-button" type="button" onClick={next}>Перейти к способу доставки</button></div></fieldset>
        <fieldset disabled={busy} hidden={step !== 2}><legend id="checkout-step-2-title" tabIndex={-1}>Способ доставки</legend><div className="checkout-delivery-options" role="group" aria-label="Способ доставки"><button className={"checkout-delivery-option" + (deliveryMethod === "delivery" ? " is-selected" : "")} type="button" aria-pressed={deliveryMethod === "delivery"} onClick={() => { setDeliveryMethod("delivery"); setCdekDelivery(null); }}><strong>Доставка</strong><span>СДЭК</span><small>Стоимость и сроки доставки рассчитываются по тарифам СДЭК</small></button><button className={"checkout-delivery-option" + (deliveryMethod === "pickup" ? " is-selected" : "")} type="button" aria-pressed={deliveryMethod === "pickup"} onClick={() => { setDeliveryMethod("pickup"); setCdekDelivery(null); }}><strong>Самовывоз</strong><span>Бесплатно</span><small>Москва, Электролитный проезд, 3, стр. 2</small></button></div><div className="checkout-actions"><button className="checkout-secondary-button" type="button" onClick={() => { setStep(1); window.setTimeout(() => document.getElementById("checkout-step-1-title")?.focus(), 0); }}>Назад</button><button className="store-primary-button" type="button" onClick={nextDelivery}>Перейти к адресу</button></div></fieldset>
        <fieldset disabled={busy} hidden={step !== 3}><legend id="checkout-step-3-title" className="sr-only" tabIndex={-1}>Адрес</legend><input type="hidden" name="deliveryMethod" value="pickup" /><section className="checkout-pickup-details" aria-label="Информация о самовывозе"><p className="store-eyebrow">САМОВЫВОЗ</p><h3>Москва, Электролитный проезд, 3, стр. 2</h3><p><strong>Бесплатно</strong> · Пн–Пт, 09:00–18:00</p><p>Заберите заказ после подтверждения менеджером.</p></section>{Object.entries(pickupDetails).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<CheckoutNotesAndConsent draft={draft} errors={errors} termsUrl={termsUrl} /><div className="checkout-actions"><button className="checkout-secondary-button" type="button" onClick={() => { setStep(2); window.setTimeout(() => document.getElementById("checkout-step-2-title")?.focus(), 0); }}>Назад</button><button className="store-primary-button" type="submit">{busy ? "Переходим к оплате…" : "Перейти к оплате"}</button></div></fieldset>
      </form>}
  </div>;
}

export default function Checkout(props: CheckoutProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <CheckoutClient {...props} /> : <div className="cart-empty"><h2>Загружаем оформление…</h2></div>;
}
