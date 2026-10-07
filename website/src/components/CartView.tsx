import { cartReviewRequestSchema, paymentStartResponseSchema, paymentStatusResponseSchema } from "@web-app-demo/contracts";
import { useEffect, useMemo, useState } from "react";

import { AVAILABILITY_LABELS, displayProductSku, formatPrice, formatVariantPrice, type Product } from "../data/catalog";
import { getCartCount, readCart, removeCartItem, saveCart, setCartItemQuantity, subscribeToCart, type CartLine, type CartStorageError } from "../lib/cart";
import { readSavedPayments, requestCheckout, saveCheckoutSnapshot, type SavedPayment } from "../lib/checkout-session";
import { applyProductAvailability, useCatalogAvailability } from "../lib/catalog-availability";

function resolve(lines: CartLine[], products: Product[]) {
  return lines.flatMap((line) => {
    const product = products.find((item) => item.slug === line.productSlug
      || item.variants.some((variant) => variant.sku === line.variantSku && (variant.sourceSlug ?? item.slug) === line.productSlug));
    const variant = product?.variants.find((item) => item.sku === line.variantSku
      && (product.slug === line.productSlug || (item.sourceSlug ?? product.slug) === line.productSlug));
    return product && variant ? [{ line, product, variant }] : [];
  });
}

export default function CartView({ products: cachedProducts, apiBase }: { products: Product[]; apiBase: string }) {
  const { stock, failed } = useCatalogAvailability();
  const products = useMemo(() => cachedProducts.map((product) => applyProductAvailability(product, stock)), [cachedProducts, stock]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<CartStorageError | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [previousPayments, setPreviousPayments] = useState<SavedPayment[]>([]);
  const [checkingPayments, setCheckingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState("");
  const [proceed, setProceed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = (state: { items: CartLine[]; error: CartStorageError | null }) => {
      const valid = resolve(state.items, products).map(({ line }) => line);
      setCart(valid); setError(state.error);
      if (!state.error && valid.length !== state.items.length) saveCart(valid);
    };
    const stored = readCart(); sync(stored); setHydrated(true);
    return subscribeToCart(sync);
  }, [products]);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const saved = readSavedPayments();
        const results = await Promise.allSettled(saved.map((payment) => requestCheckout(apiBase, "/api/orders/payment/status", { paymentId: payment.paymentId }, paymentStatusResponseSchema, AbortSignal.timeout(10_000))));
        if (!active) return;
        setPreviousPayments(saved.filter((_, index) => {
          const result = results[index];
          return result.status === "rejected" || result.value.paymentState === "pending";
        }));
        if (results.some((result) => result.status === "rejected")) setPaymentError("Не удалось проверить предыдущую оплату. Можно повторить попытку или перейти к новой корзине.");
      } catch { if (active) setPaymentError("Не удалось прочитать сохранённые оплаты. Проверьте доступ к хранилищу браузера."); }
      finally { if (active) setCheckingPayments(false); }
    }
    void check();
    return () => { active = false; };
  }, [apiBase]);

  async function continuePayment(saved: SavedPayment) {
    if (busy) return;
    setBusy(true); setPaymentError("");
    try {
      const next = await requestCheckout(apiBase, "/api/orders/payment", { checkoutToken: saved.quote.checkoutToken }, paymentStartResponseSchema);
      if (next.paymentId !== saved.paymentId) throw new Error("Сервис вернул другую оплату. Обновите страницу.");
      saveCheckoutSnapshot({ ...saved, ...(next.attemptId ? { attemptId: next.attemptId } : {}) });
      location.assign(next.confirmationUrl);
    } catch (cause) {
      setPaymentError(cause instanceof Error ? cause.message : "Не удалось открыть оплату.");
      try {
        const status = await requestCheckout(apiBase, "/api/orders/payment/status", { paymentId: saved.paymentId }, paymentStatusResponseSchema);
        if (status.paymentState === "succeeded" || status.paymentState === "canceled") {
          setPreviousPayments((payments) => payments.filter((payment) => payment.paymentId !== saved.paymentId));
          setPaymentError(status.paymentState === "succeeded" ? "Предыдущая оплата уже подтверждена. Можно оформить новую корзину." : "Предыдущая оплата отменена. Можно оформить новую корзину.");
        }
      } catch { /* Keep the saved payment available when its status cannot be verified. */ }
      setBusy(false);
    }
  }

  if (!hydrated || checkingPayments) return <div className="cart-empty" role="status"><h2>Загружаем корзину…</h2></div>;
  if (error) return <div className="cart-empty" role="alert"><h2>Корзина недоступна</h2><p>Разрешите хранение данных в браузере и обновите страницу.</p></div>;
  if (!proceed && previousPayments.length) return <section className="cart-payment-choice" aria-labelledby="previous-payment-title">
    <h2 id="previous-payment-title">{paymentError ? "Предыдущая оплата" : previousPayments.length === 1 ? "У вас есть неоплаченный заказ" : "У вас есть неоплаченные заказы"}</h2>
    <p>{paymentError ? "Если оплатить предыдущий и новый заказы, каждый будет оформлен отдельно." : previousPayments.length === 1 ? "Предыдущая ссылка на оплату ещё активна. Если оплатить оба заказа, каждый будет оформлен отдельно." : "Предыдущие ссылки на оплату ещё активны. Каждый оплаченный заказ будет оформлен отдельно."}</p>
    {paymentError && <p role="alert">{paymentError}</p>}
    <div className="cart-pending-payments">{previousPayments.map((saved) => <article className="cart-pending-payment" key={saved.paymentId}>
      <ul className="checkout-total-list">{saved.quote.totals.items.map((item) => <li key={item.sku}><span>{item.name} · {item.quantity} шт.</span></li>)}</ul>
      <strong>{formatPrice(saved.quote.totals.totalMinor / 100)}</strong>
      <button className="checkout-secondary-button" type="button" disabled={busy} onClick={() => continuePayment(saved)}>{busy ? "Проверяем оплату…" : "Продолжить предыдущую оплату"}</button>
    </article>)}</div>
    <button className="store-primary-button" type="button" disabled={busy} onClick={() => setProceed(true)}>Перейти к новой корзине</button>
  </section>;
  const lines = resolve(cart, products);
  if (!lines.length) return <div className="cart-empty"><h2>Корзина пока пуста</h2><p>Добавьте подходящий источник энергии из каталога.</p><a className="store-primary-button" href="/catalog">Перейти в каталог</a></div>;

  const total = lines.reduce((sum, { line, variant }) => sum + line.quantity * variant.price, 0);
  const pendingPrice = lines.some(({ variant }) => variant.availability === "preorder");
  const hasDemo = lines.some(({ product }) => product.demo);
  const preorder = lines.some(({ variant }) => variant.availability === "preorder");
  const unavailable = lines.some(({ variant }) => variant.availability === "unavailable");
  const blocked = hasDemo || preorder || unavailable;
  function update(next: CartLine[]) { const state = saveCart(next); setCart(state.items); setError(state.error); }
  function checkout() {
    if (hasDemo) return setCheckoutError("Удалите тестовые экземпляры из корзины, чтобы оформить заказ.");
    if (preorder) return setCheckoutError("Этот товар можно только добавить в список ожидания. Удалите его из корзины и оставьте заявку на странице товара.");
    if (unavailable) return setCheckoutError("Удалите недоступные товары из корзины перед оформлением.");
    const parsed = cartReviewRequestSchema.safeParse({ version: 1, items: cart.map((line) => ({ slug: line.productSlug, sku: line.variantSku, quantity: line.quantity })) });
    if (!parsed.success) return setCheckoutError("Проверьте состав и количество товаров.");
    if (saveCart(cart).error) return setCheckoutError("Не удалось сохранить корзину. Проверьте доступ к хранилищу браузера.");
    location.assign(`/checkout#cart=${encodeURIComponent(JSON.stringify(parsed.data))}`);
  }

  return <>
    {failed && <p className="cart-checkout-note" role="status">Не удалось обновить наличие. Проверим его перед оплатой.</p>}
    {paymentError && <p className="cart-checkout-note" role="status">{paymentError}</p>}
    <div className="cart-layout">
    <div className="cart-lines" aria-label="Товары в корзине">{lines.map(({ line, product, variant }) => <article className="cart-line" key={`${line.productSlug}:${line.variantSku}`}>
      <a className="cart-line-image" href={`/catalog/${product.slug}?variant=${encodeURIComponent(variant.sku)}`}><img src={variant.image ?? product.image} alt="" /></a>
      <div className="cart-line-info">
        <p className="store-product-category">{product.category}</p><h2><a href={`/catalog/${product.slug}`}>{product.name}</a></h2>
        {product.demo && <p className="store-product-card-description">Тестовый экземпляр — не продаётся</p>}
        <p>SKU: {displayProductSku(product, variant.sku)} · {AVAILABILITY_LABELS[variant.availability]}</p><strong>{formatVariantPrice(variant)}</strong>
        {variant.availability === "preorder" && <p className="cart-checkout-note">Этот вариант нельзя купить сейчас. Удалите его из корзины и оставьте заявку на странице товара.</p>}
        {variant.availability === "unavailable" && <p className="cart-checkout-note">Этот вариант больше недоступен. Удалите его перед оформлением.</p>}
        <div className="cart-quantity" role="group" aria-label={`Количество ${product.name}`}>
          <button type="button" aria-label="Уменьшить количество" onClick={() => update(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity - 1))}>−</button>
          <span aria-live="polite">{line.quantity}</span>
          <button type="button" aria-label="Увеличить количество" disabled={line.quantity >= 99 || variant.availability !== "in-stock"} onClick={() => update(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity + 1))}>+</button>
          <button className="cart-remove" type="button" onClick={() => update(removeCartItem(cart, line.productSlug, line.variantSku))}>Удалить</button>
        </div>
      </div>
    </article>)}</div>
    <aside className="cart-summary"><p className="store-eyebrow">ИТОГО</p><h2>Ваш заказ</h2><div className="cart-summary-row"><span>Товаров</span><strong>{getCartCount(cart)}</strong></div><div className="cart-summary-row cart-summary-total"><span>Сумма</span><strong>{pendingPrice ? "Цена уточняется" : formatPrice(total)}</strong></div><p>Перед заказом сервер ещё раз проверит цену, наличие и промокод.</p><button className="store-primary-button" type="button" disabled={blocked} onClick={checkout}>Перейти к оформлению</button><button className="cart-clear" type="button" onClick={() => { if (confirm("Очистить всю корзину?")) update([]); }}>Очистить корзину</button>{preorder && <p className="cart-checkout-note">Товары с нулевым остатком нельзя оформить или оплатить. Для уведомления откройте карточку товара и оставьте заявку.</p>}{unavailable && <p className="cart-checkout-note">В корзине есть недоступный вариант.</p>}{hasDemo && <p className="cart-checkout-note">Удалите тестовые экземпляры из корзины, чтобы оформить заказ.</p>}{checkoutError && <p className="cart-checkout-note" role="alert">{checkoutError}</p>}</aside>
  </div></>;
}
