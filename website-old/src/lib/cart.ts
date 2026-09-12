import type { Product } from '@/features/catalog'

export const CART_STORAGE_KEY = 'nikass-cart'
export const CART_STORAGE_VERSION = 1
export const CART_CHANGED_EVENT = 'nikass:cart-changed'

const CART_CHANNEL_NAME = 'nikass-cart-channel'

export type CartLine = {
  productSlug: string
  variantSku: string
  quantity: number
}

export type CartStorageError = 'read-failed' | 'write-failed'

export type CartState = {
  items: CartLine[]
  error: CartStorageError | null
}

export type CartListener = (state: CartState) => void

type StoredCart = {
  version: number
  items: unknown
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false

  const line = value as Partial<CartLine>
  return (
    typeof line.productSlug === 'string' &&
    line.productSlug.length > 0 &&
    typeof line.variantSku === 'string' &&
    line.variantSku.length > 0 &&
    isPositiveInteger(line.quantity)
  )
}

export function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []

  const lines = new Map<string, CartLine>()

  for (const candidate of value) {
    if (!isCartLine(candidate)) continue

    const key = `${candidate.productSlug}\u0000${candidate.variantSku}`
    const line = {
      productSlug: candidate.productSlug,
      variantSku: candidate.variantSku,
      quantity: candidate.quantity,
    }
    const existing = lines.get(key)
    lines.set(key, existing
      ? { ...existing, quantity: Math.min(Number.MAX_SAFE_INTEGER, existing.quantity + line.quantity) }
      : line)
  }

  return [...lines.values()]
}

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCart>
    return parsed.version === CART_STORAGE_VERSION ? normalizeCart(parsed.items) : []
  } catch {
    return []
  }
}

export function addCartItem(
  cart: CartLine[],
  product: Pick<Product, 'slug' | 'variants'>,
  variantSku: string,
  quantity = 1,
): CartLine[] {
  const next = normalizeCart(cart)
  const variant = product.variants.find((item) => item.sku === variantSku)

  if (!variant || variant.availability === 'unavailable' || !isPositiveInteger(quantity)) {
    return next
  }

  const existing = next.find((item) => item.productSlug === product.slug && item.variantSku === variantSku)
  if (existing) {
    return next.map((item) => item === existing
      ? { ...item, quantity: Math.min(Number.MAX_SAFE_INTEGER, item.quantity + quantity) }
      : item)
  }

  return [...next, { productSlug: product.slug, variantSku, quantity }]
}

export function setCartItemQuantity(
  cart: CartLine[],
  productSlug: string,
  variantSku: string,
  quantity: number,
): CartLine[] {
  const next = normalizeCart(cart)
  if (!Number.isSafeInteger(quantity)) return next
  if (quantity <= 0) return removeCartItem(next, productSlug, variantSku)

  return next.map((item) => item.productSlug === productSlug && item.variantSku === variantSku
    ? { ...item, quantity }
    : item)
}

export function removeCartItem(cart: CartLine[], productSlug: string, variantSku: string): CartLine[] {
  return normalizeCart(cart).filter((item) => item.productSlug !== productSlug || item.variantSku !== variantSku)
}

export function getCartCount(cart: CartLine[]): number {
  return normalizeCart(cart).reduce((total, item) => total + item.quantity, 0)
}

function serializeCart(cart: CartLine[]): string {
  return JSON.stringify({ version: CART_STORAGE_VERSION, items: normalizeCart(cart) })
}

function broadcastCart(): void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return

  const channel = new BroadcastChannel(CART_CHANNEL_NAME)
  // ponytail: sessionStorage is tab-scoped, so broadcast invalidation only; a shared payload would overwrite another tab's cart.
  channel.postMessage({ type: 'changed' })
  channel.close()
}

export function readCart(): CartState {
  if (typeof window === 'undefined') return { items: [], error: null }

  try {
    return { items: parseCart(window.sessionStorage.getItem(CART_STORAGE_KEY)), error: null }
  } catch {
    return { items: [], error: 'read-failed' }
  }
}

export function saveCart(cart: CartLine[]): CartState {
  const next = normalizeCart(cart)
  if (typeof window === 'undefined') return { items: next, error: null }

  let error: CartStorageError | null = null

  try {
    window.sessionStorage.setItem(CART_STORAGE_KEY, serializeCart(next))
  } catch {
    error = 'write-failed'
  }

  const state = { items: next, error }
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: state }))
  broadcastCart()
  return state
}

export function subscribeToCart(listener: CartListener): () => void {
  if (typeof window === 'undefined') return () => undefined

  const notify = (state: Partial<CartState> | undefined) => listener({
    items: normalizeCart(state?.items),
    error: state?.error ?? null,
  })
  const onCustomEvent = (event: Event) => {
    notify((event as CustomEvent<Partial<CartState>>).detail)
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) notify({ items: parseCart(event.newValue) })
  }
  const onChannelMessage = () => {
    listener(readCart())
  }

  let channel: BroadcastChannel | undefined
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CART_CHANNEL_NAME)
    channel.addEventListener('message', onChannelMessage)
  }

  window.addEventListener(CART_CHANGED_EVENT, onCustomEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, onCustomEvent)
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onChannelMessage)
    channel?.close()
  }
}
