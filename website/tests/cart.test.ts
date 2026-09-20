import assert from "node:assert/strict";
import test from "node:test";

import type { Product } from "../src/data/catalog";
import { addCartItem, normalizeCart, parseCart, removeCartItem, setCartItemQuantity } from "../src/lib/cart";

const product: Product = {
  slug: "nikass-invertor-1200",
  sku: "3204442838",
  name: "NIKASS Инвертор 1200 Вт",
  category: "Автомобильные инверторы",
  rawCategory: "invertory",
  price: 4333,
  oldPrice: 90000,
  description: "Инвертор для автомобиля.",
  packageContents: "Инвертор",
  characteristics: "Мощность: 1200 Вт",
  image: "https://cdn.example.com/inverter.jpg",
  variants: [{ sku: "3204442838", label: "Основной вариант", price: 4333, oldPrice: 90000, availability: "in-stock" }],
};

test("merges duplicate lines, caps quantity and strips stale stored fields", () => {
  const variant = product.variants[0];
  const cart = addCartItem(addCartItem([], product, variant.sku, 98), product, variant.sku, 5);

  assert.deepEqual(cart, [{ productSlug: product.slug, variantSku: variant.sku, quantity: 99 }]);
  assert.deepEqual(normalizeCart([{ ...cart[0], name: "stale" }, cart[0]]), [{ ...cart[0], quantity: 99 }]);
  assert.deepEqual(parseCart(JSON.stringify({ version: 0, items: cart })), []);
});

test("allows preorder, blocks unavailable and removes a line at zero", () => {
  const base = product;
  const preorder: Product = { ...base, variants: [{ ...base.variants[0], sku: "pre", availability: "preorder" }] };
  const unavailable: Product = { ...base, variants: [{ ...base.variants[0], sku: "off", availability: "unavailable" }] };

  assert.equal(addCartItem([], preorder, "pre").length, 1);
  assert.deepEqual(addCartItem([], unavailable, "off"), []);
  assert.deepEqual(setCartItemQuantity([{ productSlug: base.slug, variantSku: base.sku, quantity: 1 }], base.slug, base.sku, 0), []);
  assert.deepEqual(removeCartItem([{ productSlug: base.slug, variantSku: base.sku, quantity: 1 }], base.slug, base.sku), []);
});
