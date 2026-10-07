import { catalogAvailabilityResponseSchema } from "@web-app-demo/contracts";
import { useSyncExternalStore } from "react";
import type { Availability, Product } from "../data/catalog";

type Snapshot = { stock: ReadonlyMap<string, Availability> | null; failed: boolean };
const initial: Snapshot = { stock: null, failed: false };
const apiBase = (import.meta.env.PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
let snapshot = initial;
let pending: Promise<void> | undefined;
let timer: number | undefined;
const listeners = new Set<() => void>();
const variantKey = (slug: string, sku: string) => `${slug}\0${sku}`;

// Astro cards are separate React islands; they share one request and one polling timer.
function refresh() {
  if (document.visibilityState === "hidden" || pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(`${apiBase}/api/catalog/availability`, {
        headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("Availability request failed");
      const result = catalogAvailabilityResponseSchema.parse(await response.json());
      if (result.stale) throw new Error("Availability is stale");
      snapshot = { stock: new Map(result.items.flatMap(({ slug, variants }) =>
        variants.map(({ sku, availability }) => [variantKey(slug, sku), availability] as const))), failed: false };
    } catch {
      // Keep the last known status and cached price; checkout still requires a live check.
      snapshot = { ...snapshot, failed: true };
    }
    listeners.forEach((listener) => listener());
  })().finally(() => { pending = undefined; });
  return pending;
}

function onActive() { void refresh(); }

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh();
    timer = window.setInterval(onActive, 60_000);
    document.addEventListener("visibilitychange", onActive);
    window.addEventListener("focus", onActive);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onActive);
      window.removeEventListener("focus", onActive);
    }
  };
}

export function useCatalogAvailability() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}

export function applyProductAvailability(product: Product, stock: Snapshot["stock"]): Product {
  if (!stock || product.demo) return product;
  let changed = false;
  const variants = product.variants.map((variant) => {
    const availability = stock.get(variantKey(variant.sourceSlug ?? product.slug, variant.sku)) ?? "unavailable";
    if (availability === variant.availability) return variant;
    changed = true;
    return { ...variant, availability };
  });
  return changed ? { ...product, variants } : product;
}
