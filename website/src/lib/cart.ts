import { isVariantAddable, type Product } from "../data/catalog";

export const CART_STORAGE_KEY = "nikass-cart";
export const CART_CHANGED_EVENT = "nikass:cart-changed";
const CART_STORAGE_VERSION = 1;
const MAX_QUANTITY = 99;

export type CartLine = { productSlug: string; variantSku: string; quantity: number };
export type CartStorageError = "read-failed" | "write-failed";
export type CartState = { items: CartLine[]; error: CartStorageError | null; revision?: string };

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return typeof line.productSlug === "string" && line.productSlug.length > 0
    && typeof line.variantSku === "string" && line.variantSku.length > 0
    && Number.isSafeInteger(line.quantity) && Number(line.quantity) > 0;
}

export function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, CartLine>();
  for (const candidate of value) {
    if (!isCartLine(candidate)) continue;
    const key = `${candidate.productSlug}\0${candidate.variantSku}`;
    const previous = lines.get(key);
    lines.set(key, { productSlug: candidate.productSlug, variantSku: candidate.variantSku, quantity: Math.min(MAX_QUANTITY, (previous?.quantity ?? 0) + candidate.quantity) });
  }
  return [...lines.values()];
}

function parseCartState(raw: string | null): CartState {
  if (!raw) return { items: [], error: null };
  try {
    const value = JSON.parse(raw) as { version?: unknown; items?: unknown; revision?: unknown };
    if (value.version !== CART_STORAGE_VERSION) return { items: [], error: null };
    return { items: normalizeCart(value.items), error: null,
      ...(typeof value.revision === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.revision) ? { revision: value.revision } : {}) };
  } catch { return { items: [], error: null }; }
}

export function parseCart(raw: string | null): CartLine[] { return parseCartState(raw).items; }

export function addCartItem(cart: CartLine[], product: Pick<Product, "slug" | "variants">, variantSku: string, quantity = 1) {
  const next = normalizeCart(cart);
  const variant = product.variants.find((item) => item.sku === variantSku);
  if (!variant || !isVariantAddable(variant) || !Number.isSafeInteger(quantity) || quantity <= 0) return next;
  const productSlug = variant.sourceSlug ?? product.slug;
  const existing = next.find((item) => item.productSlug === productSlug && item.variantSku === variantSku);
  return existing
    ? next.map((item) => item === existing ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) } : item)
    : [...next, { productSlug, variantSku, quantity: Math.min(MAX_QUANTITY, quantity) }];
}

export function setCartItemQuantity(cart: CartLine[], productSlug: string, variantSku: string, quantity: number) {
  const next = normalizeCart(cart);
  if (!Number.isSafeInteger(quantity)) return next;
  if (quantity <= 0) return removeCartItem(next, productSlug, variantSku);
  return next.map((item) => item.productSlug === productSlug && item.variantSku === variantSku ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) } : item);
}

export function removeCartItem(cart: CartLine[], productSlug: string, variantSku: string) {
  return normalizeCart(cart).filter((item) => item.productSlug !== productSlug || item.variantSku !== variantSku);
}

export function getCartCount(cart: CartLine[]) {
  return normalizeCart(cart).reduce((sum, item) => sum + item.quantity, 0);
}

export function readCart(): CartState {
  if (typeof window === "undefined") return { items: [], error: null };
  try { return parseCartState(sessionStorage.getItem(CART_STORAGE_KEY)); }
  catch { return { items: [], error: "read-failed" }; }
}

export function saveCart(cart: CartLine[]): CartState {
  const items = normalizeCart(cart);
  if (typeof window === "undefined") return { items, error: null };
  let error: CartStorageError | null = null;
  let revision: string | undefined;
  try { revision = crypto.randomUUID(); sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_STORAGE_VERSION, items, revision })); }
  catch { error = "write-failed"; }
  const state = { items, error, ...(error ? {} : { revision }) };
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: state }));
  return state;
}

export function clearCartIfUnchanged(revision?: string): CartState {
  const current = readCart();
  return !current.error && revision && current.revision === revision ? saveCart([]) : current;
}

export function subscribeToCart(listener: (state: CartState) => void) {
  if (typeof window === "undefined") return () => undefined;
  const update = (event: Event) => listener((event as CustomEvent<CartState>).detail ?? readCart());
  window.addEventListener(CART_CHANGED_EVENT, update);
  return () => window.removeEventListener(CART_CHANGED_EVENT, update);
}
