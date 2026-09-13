import { cartReviewRequestSchema } from "@web-app-demo/contracts";
import { useEffect, useState } from "react";

import { AVAILABILITY_LABELS, formatPrice, type Product } from "../data/catalog";
import { getCartCount, readCart, removeCartItem, saveCart, setCartItemQuantity, subscribeToCart, type CartLine, type CartStorageError } from "../lib/cart";

function resolve(lines: CartLine[], products: Product[]) {
  return lines.flatMap((line) => {
    const product = products.find((item) => item.slug === line.productSlug);
    const variant = product?.variants.find((item) => item.sku === line.variantSku);
    return product && variant ? [{ line, product, variant }] : [];
  });
}

export default function CartView({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<CartStorageError | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const sync = (state: { items: CartLine[]; error: CartStorageError | null }) => {
      const valid = resolve(state.items, products).map(({ line }) => line);
      setCart(valid); setError(state.error);
      if (!state.error && valid.length !== state.items.length) saveCart(valid);
    };
    const stored = readCart(); sync(stored); setHydrated(true);
    return subscribeToCart(sync);
  }, [products]);

  if (!hydrated) return <div className="cart-empty"><h2>Загружаем корзину…</h2></div>;
  if (error) return <div className="cart-empty" role="alert"><h2>Корзина недоступна</h2><p>Разрешите хранение данных в браузере и обновите страницу.</p></div>;
  const lines = resolve(cart, products);
  if (!lines.length) return <div className="cart-empty"><h2>Корзина пока пуста</h2><p>Добавьте подходящий источник энергии из каталога.</p><a className="store-primary-button" href="/catalog">Перейти в каталог</a></div>;

  const total = lines.reduce((sum, { line, variant }) => sum + line.quantity * variant.price, 0);
  const blocked = lines.some(({ variant }) => variant.availability === "unavailable");
  function update(next: CartLine[]) { const state = saveCart(next); setCart(state.items); setError(state.error); }
  function checkout() {
    const parsed = cartReviewRequestSchema.safeParse({ version: 1, items: cart.map((line) => ({ slug: line.productSlug, sku: line.variantSku, quantity: line.quantity })) });
    if (!parsed.success) return setCheckoutError("Проверьте состав и количество товаров.");
    location.assign("/checkout");
  }

  return <div className="cart-layout">
    <div className="cart-lines" aria-label="Товары в корзине">{lines.map(({ line, product, variant }) => <article className="cart-line" key={`${line.productSlug}:${line.variantSku}`}>
      <a className="cart-line-image" href={`/catalog/${product.slug}`}><img src={product.image} alt="" /></a>
      <div className="cart-line-info">
        <p className="store-product-category">{product.category}</p><h2><a href={`/catalog/${product.slug}`}>{product.name}</a></h2>
        <p>SKU: {variant.sku} · {AVAILABILITY_LABELS[variant.availability]}</p><strong>{formatPrice(variant.price)}</strong>
        {variant.availability === "unavailable" && <p className="cart-checkout-note">Этот вариант больше недоступен. Удалите его перед оформлением.</p>}
        <div className="cart-quantity" role="group" aria-label={`Количество ${product.name}`}>
          <button type="button" aria-label="Уменьшить количество" onClick={() => update(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity - 1))}>−</button>
          <span aria-live="polite">{line.quantity}</span>
          <button type="button" aria-label="Увеличить количество" disabled={line.quantity >= 99 || variant.availability === "unavailable"} onClick={() => update(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity + 1))}>+</button>
          <button className="cart-remove" type="button" onClick={() => update(removeCartItem(cart, line.productSlug, line.variantSku))}>Удалить</button>
        </div>
      </div>
    </article>)}</div>
    <aside className="cart-summary"><p className="store-eyebrow">ИТОГО</p><h2>Ваш заказ</h2><div className="cart-summary-row"><span>Товаров</span><strong>{getCartCount(cart)}</strong></div><div className="cart-summary-row cart-summary-total"><span>Сумма</span><strong>{formatPrice(total)}</strong></div><p>Перед заказом сервер ещё раз проверит цену, наличие и промокод.</p><button className="store-primary-button" type="button" disabled={blocked} onClick={checkout}>Перейти к оформлению</button><button className="cart-clear" type="button" onClick={() => { if (confirm("Очистить всю корзину?")) update([]); }}>Очистить корзину</button>{blocked && <p className="cart-checkout-note">В корзине есть недоступный вариант.</p>}{checkoutError && <p className="cart-checkout-note" role="alert">{checkoutError}</p>}</aside>
  </div>;
}
