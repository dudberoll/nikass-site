import { cartReviewRequestSchema } from '@web-app-demo/contracts'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  AVAILABILITY_LABELS,
  formatPrice,
  PRODUCTS,
  type Availability,
  type Product,
} from '@/features/catalog'
import {
  getCartCount,
  readCart,
  removeCartItem,
  saveCart,
  setCartItemQuantity,
  subscribeToCart,
  type CartLine,
  type CartStorageError,
} from '@/lib/cart'

type ResolvedCartLine = {
  line: CartLine
  product: Product
  variant: Product['variants'][number]
}

const availabilityClass: Record<Availability, string> = {
  'in-stock': 'cart-line__status--in-stock',
  preorder: 'cart-line__status--preorder',
  unavailable: 'cart-line__status--unavailable',
}

function resolveCartLines(cart: CartLine[]): ResolvedCartLine[] {
  return cart.flatMap((line) => {
    const product = PRODUCTS.find((item) => item.slug === line.productSlug)
    const variant = product?.variants.find((item) => item.sku === line.variantSku)

    return product && variant ? [{ line, product, variant }] : []
  })
}

function emptyCart() {
  return (
    <section className="cart-page catalog-container" data-cart-empty aria-labelledby="cart-title">
      <p className="catalog-eyebrow">NIKASS / КОРЗИНА</p>
      <h1 id="cart-title">Корзина пока пуста.</h1>
      <p>Добавьте подходящий вариант товара из каталога.</p>
      <a className="nikass-button" href="/catalog">Перейти в каталог →</a>
    </section>
  )
}

function loadingCart() {
  return (
    <section className="cart-page catalog-container" data-cart-loading aria-labelledby="cart-title">
      <p className="catalog-eyebrow">NIKASS / КОРЗИНА</p>
      <h1 id="cart-title">Загружаем корзину…</h1>
      <p>Проверяем локальные позиции в этой вкладке.</p>
    </section>
  )
}

function storageErrorCart(error: CartStorageError, onRetry: () => void) {
  const message = error === 'read-failed'
    ? 'Браузер не разрешил прочитать локальную корзину.'
    : 'Браузер не разрешил сохранить изменения корзины.'

  return (
    <section className="cart-page catalog-container" data-cart-error aria-labelledby="cart-title">
      <p className="catalog-eyebrow">NIKASS / КОРЗИНА</p>
      <h1 id="cart-title">Не удалось открыть локальную корзину.</h1>
      <p>{message} Разрешите хранение данных в браузере и повторите попытку.</p>
      <Button type="button" variant="outline" onClick={onRetry}>Повторить</Button>
    </section>
  )
}

export default function CartView() {
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutError, setCheckoutError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState<CartStorageError | null>(null)

  useEffect(() => {
    const sync = (state: { items: CartLine[]; error: CartStorageError | null }) => {
      setStorageError(state.error)
      setCart(resolveCartLines(state.items).map(({ line }) => line))
    }
    const unsubscribe = subscribeToCart(sync)
    const stored = readCart()
    const current = resolveCartLines(stored.items).map(({ line }) => line)

    setCart(current)
    setStorageError(stored.error)
    setHydrated(true)
    if (!stored.error && current.length !== stored.items.length) saveCart(current)

    return unsubscribe
  }, [])

  const retryStorage = () => {
    const stored = readCart()
    setStorageError(stored.error)
    setCart(resolveCartLines(stored.items).map(({ line }) => line))
  }

  const checkout = () => {
    try {
      const payload = cartReviewRequestSchema.parse({ version: 1, items: cart.map((line) => ({ slug: line.productSlug, sku: line.variantSku, quantity: line.quantity })) })
      const url = new URL('/checkout', import.meta.env.PUBLIC_WEBAPP_URL)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
      url.hash = new URLSearchParams({ cart: JSON.stringify(payload) }).toString()
      window.location.assign(url.href)
    } catch { setCheckoutError('Не удалось перейти к оформлению. Проверьте количество товаров; адрес оформления должен быть настроен.') }
  }

  const lines = resolveCartLines(cart)
  if (!hydrated) return loadingCart()
  if (storageError) return storageErrorCart(storageError, retryStorage)
  if (lines.length === 0) return emptyCart()

  const total = lines.reduce((sum, { line, variant }) => sum + variant.price * line.quantity, 0)
  const hasUnavailable = lines.some(({ variant }) => variant.availability === 'unavailable')

  return (
    <section className="cart-page catalog-container" data-cart-view aria-labelledby="cart-title">
      <div className="cart-page__heading">
        <div>
          <p className="catalog-eyebrow">NIKASS / КОРЗИНА</p>
          <h1 id="cart-title">Ваша корзина</h1>
        </div>
        <Button type="button" variant="outline" onClick={() => saveCart([])}>
          Очистить корзину
        </Button>
      </div>

      <div className="cart-page__body">
        <div className="cart-line-list" aria-label="Товары в корзине">
          {lines.map(({ line, product, variant }) => {
            const isUnavailable = variant.availability === 'unavailable'

            return (
              <article className="cart-line" data-cart-line={`${line.productSlug}:${line.variantSku}`} key={`${line.productSlug}:${line.variantSku}`}>
                <a className="cart-line__image-link" href={`/catalog/${product.slug}`} aria-label={`Открыть ${product.name}`}>
                  {product.images[0] ? <img className="cart-line__image" src={product.images[0]} alt="" /> : <span>Фото пока не добавлено</span>}
                </a>

                <div className="cart-line__details">
                  <a className="cart-line__product-link" href={`/catalog/${product.slug}`}>
                    <h2>{product.name}</h2>
                  </a>
                  <p>{variant.label}</p>
                  <p className="cart-line__sku">SKU: {variant.sku}</p>
                  <span className={`cart-line__status ${availabilityClass[variant.availability]}`}>
                    {AVAILABILITY_LABELS[variant.availability]}
                  </span>
                  {isUnavailable && (
                    <p className="cart-line__warning">Этот вариант больше недоступен. Удалите его перед следующим этапом.</p>
                  )}
                </div>

                <div className="cart-line__actions">
                  <div className="cart-line__prices">
                    <span>Цена за 1 шт.: {formatPrice(variant.price)}</span>
                    <strong className="cart-line__line-total">Итого: {formatPrice(variant.price * line.quantity)}</strong>
                  </div>
                  <div className="cart-quantity" role="group" aria-label={`Количество ${product.name}`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Уменьшить количество ${product.name}`}
                      disabled={isUnavailable || line.quantity <= 1}
                      onClick={() => saveCart(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity - 1))}
                    >
                      −
                    </Button>
                    <span aria-live="polite" data-cart-quantity>{line.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Увеличить количество ${product.name}`}
                      disabled={isUnavailable}
                      onClick={() => saveCart(setCartItemQuantity(cart, line.productSlug, line.variantSku, line.quantity + 1))}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="cart-line__remove"
                    onClick={() => saveCart(removeCartItem(cart, line.productSlug, line.variantSku))}
                  >
                    Удалить
                  </Button>
                </div>
              </article>
            )
          })}
        </div>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <p className="catalog-eyebrow">ИТОГО</p>
          <h2 id="cart-summary-title">Ваш заказ</h2>
          <div className="cart-summary__row">
            <span>Товаров</span>
            <strong>{getCartCount(cart)}</strong>
          </div>
          <div className="cart-summary__row cart-summary__total" role="status" aria-live="polite" data-cart-total>
            <span>Сумма</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <p className="cart-summary__note">Доставим СДЭК бесплатно. Перед оформлением проверим цену, наличие и промокод.</p>
          <Button type="button" className="cart-summary__next" disabled={hasUnavailable || !import.meta.env.PUBLIC_WEBAPP_URL} onClick={checkout} data-cart-next>
            Перейти к оформлению
          </Button>
          {checkoutError && <p role="alert">{checkoutError}</p>}
          {hasUnavailable && <p className="cart-summary__warning">В корзине есть недоступный вариант.</p>}
        </aside>
      </div>
    </section>
  )
}
