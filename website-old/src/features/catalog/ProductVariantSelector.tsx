import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AVAILABILITY_LABELS,
  formatPrice,
  type Availability,
  type Product,
} from './catalog-data'
import { getSelectedVariant, isVariantAddable } from './product-variants'
import { addCartItem, readCart, saveCart } from '@/lib/cart'

type ProductVariantSelectorProps = {
  product: Product
}

const availabilityClass: Record<Availability, string> = {
  'in-stock': 'product-variant-selector__status--in-stock',
  preorder: 'product-variant-selector__status--preorder',
  unavailable: 'product-variant-selector__status--unavailable',
}

export default function ProductVariantSelector({ product }: ProductVariantSelectorProps) {
  const [selectedSku, setSelectedSku] = useState(getSelectedVariant(product)?.sku)
  const [added, setAdded] = useState(false)
  const [cartError, setCartError] = useState(false)
  const selectedVariant = getSelectedVariant(product, selectedSku)

  if (!selectedVariant) {
    return <p className="product-variant-selector__empty">Для товара пока не добавлены варианты.</p>
  }

  const isUnavailable = !isVariantAddable(selectedVariant)
  const selectionNote = cartError
    ? 'Корзина не сохранилась. Разрешите хранение данных в браузере и повторите попытку.'
    : added
    ? 'Вариант добавлен в локальную корзину.'
    : isUnavailable
    ? 'Этот вариант недоступен для заказа.'
    : selectedVariant.availability === 'preorder'
      ? 'Для этого варианта доступен предзаказ.'
      : 'Можно добавить в локальную корзину.'

  const handleAdd = () => {
    if (isUnavailable) return
    const stored = readCart()
    if (stored.error) {
      setCartError(true)
      setAdded(false)
      return
    }

    const result = saveCart(addCartItem(stored.items, product, selectedVariant.sku))
    setCartError(Boolean(result.error))
    setAdded(!result.error)
  }

  return (
    <section className="product-variant-selector" aria-labelledby="variant-selector-title">
      <div className="product-variant-selector__heading">
        <p className="catalog-eyebrow">ВЫБОР ВАРИАНТА</p>
        <h2 id="variant-selector-title">Настройте комплект</h2>
      </div>

      <fieldset className="product-variant-selector__options">
        <legend className="sr-only">Варианты {product.name}</legend>
        {product.variants.map((variant) => (
          <button
            className={`product-variant-selector__option${variant.sku === selectedVariant.sku ? ' is-selected' : ''}`}
            type="button"
            aria-pressed={variant.sku === selectedVariant.sku}
            data-variant-sku={variant.sku}
            onClick={() => {
              setSelectedSku(variant.sku)
              setAdded(false)
              setCartError(false)
            }}
            key={variant.sku}
          >
            <span className="product-variant-selector__option-label">{variant.label}</span>
            <small>{variant.sku}</small>
            <strong>{formatPrice(variant.price)}</strong>
            <Badge variant="outline" className={`product-variant-selector__status ${availabilityClass[variant.availability]}`}>
              {AVAILABILITY_LABELS[variant.availability]}
            </Badge>
          </button>
        ))}
      </fieldset>

      <div className="product-variant-selector__summary" role="status" aria-live="polite">
        <div>
          <span>SKU</span>
          <strong data-product-sku>{selectedVariant.sku}</strong>
        </div>
        <div>
          <span>Цена</span>
          <div className="product-variant-selector__price">
            <strong data-product-price>{formatPrice(selectedVariant.price)}</strong>
            {selectedVariant.oldPrice && <del data-product-old-price>{formatPrice(selectedVariant.oldPrice)}</del>}
          </div>
        </div>
        <Badge variant="outline" className={`product-variant-selector__status ${availabilityClass[selectedVariant.availability]}`}>
          {AVAILABILITY_LABELS[selectedVariant.availability]}
        </Badge>
      </div>

      {selectedVariant.oldPrice && product.promotionPeriod && (
        <p className="product-variant-selector__promotion">Акция {product.promotionPeriod}</p>
      )}

      <p className="product-variant-selector__note">{selectionNote}</p>
      <Button
        type="button"
        className="product-variant-selector__add"
        disabled={isUnavailable}
        data-cart-stage={isUnavailable ? 'blocked' : 'ready'}
        onClick={handleAdd}
      >
        {added ? 'Добавлено ✓' : 'Добавить в корзину'}
      </Button>
      {added && <a className="product-variant-selector__cart-link" href="/cart">Перейти в корзину →</a>}
    </section>
  )
}
