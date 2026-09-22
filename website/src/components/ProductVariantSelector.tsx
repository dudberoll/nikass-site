import { useEffect, useState } from "react";

import { AVAILABILITY_LABELS, formatPrice, getSelectedVariant, isVariantAddable, type Product } from "../data/catalog";
import { addCartItem, readCart, saveCart } from "../lib/cart";

const MAX_QUANTITY = 99;

export default function ProductVariantSelector({ product }: { product: Product }) {
  const [sku, setSku] = useState(product.variants[0]?.sku);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const variant = getSelectedVariant(product, sku);
  useEffect(() => {
    if (variant) window.dispatchEvent(new CustomEvent("nikass:product-variant-change", { detail: { label: variant.label, sku: variant.sku } }));
  }, [variant?.sku]);
  if (!variant) return <p>Варианты пока не добавлены.</p>;

  function add() {
    const stored = readCart();
    if (stored.error) return setMessage("Корзина недоступна. Разрешите хранение данных в браузере.");
    const saved = saveCart(addCartItem(stored.items, product, variant.sku, quantity));
    setMessage(saved.error ? "Не удалось сохранить корзину." : `Товар добавлен: ${quantity} шт. `);
  }

  return <section className="product-variant-selector" aria-labelledby="variant-title">
    <h2 id="variant-title">Вариант</h2>
    {product.variants.length > 1 && <div className="product-variant-options">{product.variants.map((item) => <button type="button" className={item.sku === variant.sku ? "is-selected" : ""} aria-pressed={item.sku === variant.sku} onClick={() => { setSku(item.sku); setQuantity(1); setMessage(""); }} key={item.sku}><span>{item.label}</span><small>{item.sku}</small><strong>{formatPrice(item.price)}</strong></button>)}</div>}
    <div className="product-variant-summary">
      <span>{variant.label} · SKU {variant.sku}</span>
      <strong>{formatPrice(variant.price)}</strong>
      {variant.oldPrice && <del>{formatPrice(variant.oldPrice)}</del>}
      <span className={`product-availability is-${variant.availability}`}>{AVAILABILITY_LABELS[variant.availability]}</span>
    </div>
    <div className="product-variant-purchase">
      <div className="cart-quantity" role="group" aria-label={`Количество ${product.name}`}>
        <button type="button" aria-label="Уменьшить количество" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}>−</button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" aria-label="Увеличить количество" disabled={quantity >= MAX_QUANTITY || !isVariantAddable(variant)} onClick={() => setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))}>+</button>
      </div>
      <button className="store-add-button store-add-button-large" type="button" disabled={!isVariantAddable(variant)} data-cart-stage={isVariantAddable(variant) ? "ready" : "blocked"} onClick={add}>{variant.availability === "preorder" ? "Оформить предзаказ" : variant.availability === "unavailable" ? "Недоступен" : "Добавить в корзину"}</button>
    </div>
    <p className="store-added-note" role="status" aria-live="polite">{message}{message.startsWith("Товар") && <a href="/cart">Открыть корзину</a>}</p>
  </section>;
}
