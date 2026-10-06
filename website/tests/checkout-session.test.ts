import assert from "node:assert/strict";
import test from "node:test";

import { clearCartIfUnchanged, readCart, saveCart } from "../src/lib/cart";
import { readCheckoutSnapshot, readSavedPayments, saveCheckoutSnapshot } from "../src/lib/checkout-session";

test("an older receipt preserves an identical rebuilt basket and its checkout revision", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  } });
  try {
    const items = [{ productSlug: "station", variantSku: "S1", quantity: 1 }];
    const first = saveCart(items);
    assert.equal(first.error, null);
    assert.ok(first.revision);
    const quote = { checkoutToken: "a".repeat(64), expiresAt: "2099-01-01T00:00:00.000Z",
      totals: { currency: "RUB" as const, items: [{ sku: "S1", name: "Станция", quantity: 1, totalMinor: 2500 }], discountMinor: 0, shippingMinor: 0 as const, totalMinor: 2500 } };
    saveCheckoutSnapshot({ cart: { version: 1, items: [{ slug: "station", sku: "S1", quantity: 1 }] },
      cartRevision: first.revision, quote, paymentId: "223e4567-e89b-12d3-a456-426614174000" });
    assert.equal(readCheckoutSnapshot()?.cartRevision, first.revision);
    saveCheckoutSnapshot({ cart: { version: 1, items: [{ slug: "station", sku: "S1", quantity: 1 }] } });
    const oldPayment = readSavedPayments()[0];
    assert.equal(oldPayment.cartRevision, first.revision);

    saveCart([]);
    const rebuilt = saveCart(items);
    assert.notEqual(rebuilt.revision, first.revision);
    assert.deepEqual(clearCartIfUnchanged(oldPayment.cartRevision).items, items);
    assert.deepEqual(readCart().items, items);
    assert.deepEqual(clearCartIfUnchanged(undefined).items, items);
    assert.deepEqual(clearCartIfUnchanged(rebuilt.revision).items, []);
    assert.deepEqual(readCart().items, []);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousStorage) Object.defineProperty(globalThis, "sessionStorage", previousStorage);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
