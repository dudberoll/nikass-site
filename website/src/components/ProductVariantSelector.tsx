import { useState } from "react";

import { AVAILABILITY_LABELS, formatPrice, getSelectedVariant, isVariantAddable, type Product } from "../data/catalog";
import { addCartItem, readCart, saveCart } from "../lib/cart";

export default function ProductVariantSelector({ product }: { product: Product }) {
  const [sku, setSku] = useState(product.variants[0]?.sku);
  const [message, setMessage] = useState("");
  const variant = getSelectedVariant(product, sku);
  if (!variant) return <p>Варианты пока не добавлены.</p>;

  function add() {
    const stored = readCart();
    if (stored.error) return setMessage("Корзина недоступна. Разрешите хранение данных в браузере.");
    const saved = saveCart(addCartItem(stored.items, product, variant.sku));
    setMessage(saved.error ? "Не удалось сохранить корзину." : "Товар добавлен. ");
  }

  return <section className="product-variant-selector" aria-labelledby="variant-title">
    <h2 id="variant-title">Вариант</h2>
    {product.variants.length > 1 && <div className="product-variant-options">{product.variants.map((item) => <button type="button" className={item.sku === variant.sku ? "is-selected" : ""} aria-pressed={item.sku === variant.sku} onClick={() => { setSku(item.sku); setMessage(""); }} key={item.sku}><span>{item.label}</span><small>{item.sku}</small><strong>{formatPrice(item.price)}</strong></button>)}</div>}
    <div className="product-variant-summary">
      <span>{variant.label} · SKU {variant.sku}</span>
      <strong>{formatPrice(variant.price)}</strong>
      {variant.oldPrice && <del>{formatPrice(variant.oldPrice)}</del>}
      <span className={`product-availability is-${variant.availability}`}>{AVAILABILITY_LABELS[variant.availability]}</span>
    </div>
    <button className="store-add-button store-add-button-large" type="button" disabled={!isVariantAddable(variant)} data-cart-stage={isVariantAddable(variant) ? "ready" : "blocked"} onClick={add}>{variant.availability === "preorder" ? "Оформить предзаказ" : variant.availability === "unavailable" ? "Недоступен" : "Добавить в корзину"}</button>
    <p className="store-added-note" role="status" aria-live="polite">{message}{message.startsWith("Товар") && <a href="/cart">Открыть корзину</a>}</p>
  </section>;
}
