import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  AVAILABILITY_LABELS,
  CATEGORIES,
  formatPrice,
  type Availability,
  type Product,
} from './catalog-data'
import { getSelectedVariant, isVariantAddable } from './product-variants'
import { addCartItem, readCart, saveCart } from '@/lib/cart'

type CatalogGridProps = {
  products: Product[]
}

const availabilityClass: Record<Availability, string> = {
  'in-stock': 'catalog-card__status--in-stock',
  preorder: 'catalog-card__status--preorder',
  unavailable: 'catalog-card__status--unavailable',
}

function CatalogCard({ product }: { product: Product }) {
  const category = CATEGORIES.find(({ slug }) => slug === product.category)
  const [selectedSku, setSelectedSku] = useState(product.variants[0]?.sku)
  const [added, setAdded] = useState(false)
  const [cartError, setCartError] = useState(false)
  const selectedVariant = getSelectedVariant(product, selectedSku)

  if (!category) throw new Error(`Unknown category: ${product.category}`)

  if (!selectedVariant) {
    return (
      <Card className="catalog-card">
        <CardHeader className="catalog-card__header">
          <CardTitle><h2 className="catalog-card__title">{product.name}</h2></CardTitle>
        </CardHeader>
        <CardContent className="catalog-card__content">
          <p className="catalog-card__empty">Для товара пока нет вариантов.</p>
        </CardContent>
      </Card>
    )
  }

  const canAdd = isVariantAddable(selectedVariant)
  const selectionNote = cartError
    ? 'Корзина не сохранилась. Разрешите хранение данных в браузере и повторите попытку.'
    : added
    ? 'Вариант добавлен в локальную корзину.'
    : canAdd
      ? selectedVariant.availability === 'preorder'
        ? 'Для этого варианта доступен предзаказ.'
        : 'Можно добавить в локальную корзину.'
      : 'Этот вариант недоступен для заказа.'

  const handleAdd = () => {
    if (!canAdd) return
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
    <Card className="catalog-card">
      <div className="catalog-card__image-wrap">
        <a className="catalog-card__image-link" href={`/catalog/${product.slug}`} aria-label={`Открыть ${product.name}`}>
          {product.images[0] ? <img className="catalog-card__image" src={product.images[0]} alt="" loading="lazy" /> : <span>Фото пока не добавлено</span>}
        </a>
        <Badge variant="outline" className="catalog-card__category">
          {category.name}
        </Badge>
      </div>
      <CardHeader className="catalog-card__header">
        <CardTitle>
          <a className="catalog-card__title-link" href={`/catalog/${product.slug}`}>
            <h2 className="catalog-card__title">{product.name}</h2>
          </a>
        </CardTitle>
        <CardDescription className="catalog-card__description">
          {product.shortDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="catalog-card__content">
        <dl className="catalog-card__specs">
          {Object.entries(product.characteristics).slice(0, 2).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="catalog-card__variant-control">
          <label htmlFor={`catalog-variant-${product.slug}`}>Вариант</label>
          <NativeSelect
            id={`catalog-variant-${product.slug}`}
            value={selectedVariant.sku}
            onChange={(event) => {
              setSelectedSku(event.target.value)
              setAdded(false)
              setCartError(false)
            }}
          >
            {product.variants.map((variant) => (
              <NativeSelectOption key={variant.sku} value={variant.sku}>
                {variant.label} · {variant.sku} · {AVAILABILITY_LABELS[variant.availability]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="catalog-card__selection" role="status" aria-live="polite">
          <div>
            <strong data-selected-variant-sku={selectedVariant.sku}>{selectedVariant.sku}</strong>
            <small>{selectedVariant.label}</small>
          </div>
          <Badge
            variant="outline"
            className={`catalog-card__status ${availabilityClass[selectedVariant.availability]}`}
          >
            {AVAILABILITY_LABELS[selectedVariant.availability]}
          </Badge>
        </div>
        <p className="catalog-card__selection-note">{selectionNote}</p>
      </CardContent>
      <CardFooter className="catalog-card__footer">
        <div>
          <span className="catalog-card__price-label">Цена варианта</span>
          <div className="catalog-card__price-row">
            <strong className="catalog-card__price" data-product-price>{formatPrice(selectedVariant.price)}</strong>
            {selectedVariant.oldPrice && <del data-product-old-price>{formatPrice(selectedVariant.oldPrice)}</del>}
          </div>
        </div>
        <div className="catalog-card__footer-actions">
          <span className="catalog-card__warranty">Гарантия {product.warrantyMonths} мес.</span>
          <Button
            type="button"
            size="sm"
            disabled={!canAdd}
            data-cart-stage={canAdd ? 'ready' : 'blocked'}
            data-cart-variant-sku={selectedVariant.sku}
            onClick={handleAdd}
          >
            {added ? 'Добавлено ✓' : canAdd ? 'Добавить' : 'Недоступно'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function CatalogGrid({ products }: CatalogGridProps) {
  return (
    <div className="catalog-grid">
      {products.map((product) => <CatalogCard product={product} key={product.slug} />)}
    </div>
  )
}
