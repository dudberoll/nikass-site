import { cartReviewRequestSchema, orderQuoteResponseSchema, paymentStartResponseSchema, paymentStatusResponseSchema, type CartReviewRequest } from "@web-app-demo/contracts";

export const CHECKOUT_STORAGE_KEY = "nikass-checkout";
const PAYMENTS_STORAGE_KEY = "nikass-checkout-payments";
export type CheckoutSnapshot = { cart: CartReviewRequest; cartRevision?: string; quote?: ReturnType<typeof orderQuoteResponseSchema.parse>; paymentId?: string; attemptId?: string };
export type SavedPayment = CheckoutSnapshot & { quote: NonNullable<CheckoutSnapshot["quote"]>; paymentId: string };

export async function requestCheckout<T extends typeof orderQuoteResponseSchema | typeof paymentStartResponseSchema | typeof paymentStatusResponseSchema>(apiBase: string, path: string, body: unknown, schema: T, signal?: AbortSignal): Promise<ReturnType<T["parse"]>> {
  const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body), signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message ?? "Сервис оформления временно недоступен.");
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("Сервис оформления вернул некорректный ответ. Попробуйте позже.");
  return parsed.data as ReturnType<T["parse"]>;
}

function parseSnapshot(value: unknown): CheckoutSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Record<string, unknown>;
  const cart = cartReviewRequestSchema.safeParse(saved.cart);
  if (!cart.success) return null;
  const quote = orderQuoteResponseSchema.safeParse(saved.quote);
  const paymentId = paymentStartResponseSchema.shape.paymentId.safeParse(saved.paymentId);
  const attemptId = paymentStartResponseSchema.shape.attemptId.safeParse(saved.attemptId);
  const cartRevision = paymentStartResponseSchema.shape.attemptId.safeParse(saved.cartRevision);
  // Pick only recovery fields: legacy contacts and addresses never enter storage again.
  return { cart: cart.data, ...(quote.success ? { quote: quote.data } : {}),
    ...(cartRevision.success && cartRevision.data ? { cartRevision: cartRevision.data } : {}),
    ...(quote.success && paymentId.success ? { paymentId: paymentId.data } : {}),
    ...(quote.success && paymentId.success && attemptId.success && attemptId.data ? { attemptId: attemptId.data } : {}) };
}

function readJson(key: string): unknown {
  const raw = sessionStorage.getItem(key);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function readCheckoutSnapshot() { return parseSnapshot(readJson(CHECKOUT_STORAGE_KEY)); }

export function readSavedPayments(): SavedPayment[] {
  const saved = readJson(PAYMENTS_STORAGE_KEY);
  const snapshots = [...(Array.isArray(saved) ? saved : []), readCheckoutSnapshot()];
  const payments = new Map<string, SavedPayment>();
  for (const value of snapshots) {
    const snapshot = parseSnapshot(value);
    if (snapshot?.quote && snapshot.paymentId) payments.set(snapshot.paymentId, snapshot as SavedPayment);
  }
  return [...payments.values()];
}

export function saveCheckoutSnapshot(value: CheckoutSnapshot) {
  const snapshot = parseSnapshot(value);
  if (!snapshot) throw new Error("Некорректная корзина.");
  const payments = new Map(readSavedPayments().map((payment) => [payment.paymentId, payment]));
  if (snapshot.quote && snapshot.paymentId) payments.set(snapshot.paymentId, snapshot as SavedPayment);
  // Save previous payment references before replacing the current checkout.
  sessionStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify([...payments.values()]));
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearCheckoutSnapshot() {
  const payments = readSavedPayments();
  sessionStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}
