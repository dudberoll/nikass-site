import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { CATEGORIES, type Product } from './catalog-data'
import {
  CATALOG_PAGE_SIZE,
  filterAndSortProducts,
  getCharacteristicFilters,
  getPriceBounds,
  type CatalogCategory,
  type CatalogFilters,
  type CatalogSort,
} from './catalog-filters'
import CatalogGrid from './CatalogGrid'

type CatalogExplorerProps = {
  products: Product[]
  pageSize?: number
}

function parsePrice(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getInitialCategory(): CatalogCategory {
  if (typeof window === 'undefined') return 'all'

  const value = new URLSearchParams(window.location.search).get('category')
  return CATEGORIES.some((item) => item.slug === value) ? value as CatalogCategory : 'all'
}

export default function CatalogExplorer({ products, pageSize = CATALOG_PAGE_SIZE }: CatalogExplorerProps) {
  const priceBounds = useMemo(() => getPriceBounds(products), [products])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CatalogCategory>(getInitialCategory)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<CatalogSort>('popularity')
  const [characteristics, setCharacteristics] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const characteristicFilters = useMemo(
    () => getCharacteristicFilters(products, category),
    [category, products],
  )

  const filters = useMemo<CatalogFilters>(() => ({
    query,
    category,
    minPrice: parsePrice(minPrice),
    maxPrice: parsePrice(maxPrice),
    characteristics,
  }), [category, characteristics, maxPrice, minPrice, query])

  const visibleProducts = useMemo(
    () => filterAndSortProducts(products, filters, sort),
    [filters, products, sort],
  )

  const productsToRender = visibleProducts.slice(0, visibleCount)
  const hasMore = productsToRender.length < visibleProducts.length

  const hasActiveFilters = Boolean(
    query || category !== 'all' || minPrice || maxPrice || Object.values(characteristics).some(Boolean),
  )

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [category, characteristics, maxPrice, minPrice, pageSize, query, sort])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + pageSize, visibleProducts.length))
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(target)

    return () => observer.disconnect()
  }, [hasMore, pageSize, visibleProducts.length])

  function resetFilters() {
    setQuery('')
    setCategory('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('popularity')
    setCharacteristics({})
  }

  return (
    <>
      <div id="catalog-controls" className="catalog-controls" aria-label="Настройки каталога">
        <div className="catalog-controls__primary">
          <div className="catalog-control catalog-control--search">
            <label htmlFor="catalog-search">Поиск по товарам</label>
            <Input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название, SKU или характеристика"
            />
          </div>
          <div className="catalog-control">
            <label htmlFor="catalog-category">Категория</label>
            <NativeSelect
              id="catalog-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as CatalogCategory)
                setCharacteristics({})
              }}
            >
              <NativeSelectOption value="all">Все категории</NativeSelectOption>
              {CATEGORIES.map((item) => (
                <NativeSelectOption key={item.slug} value={item.slug}>
                  {item.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="catalog-control">
            <label htmlFor="catalog-sort">Сортировка</label>
            <NativeSelect id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>
              <NativeSelectOption value="popularity">По популярности</NativeSelectOption>
              <NativeSelectOption value="price-asc">Сначала дешевле</NativeSelectOption>
              <NativeSelectOption value="price-desc">Сначала дороже</NativeSelectOption>
              <NativeSelectOption value="newest">Сначала новинки</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="catalog-controls__secondary">
          <fieldset className="catalog-control catalog-price-control">
            <legend>Цена, ₽</legend>
            <div className="catalog-price-control__inputs">
              <Input
                type="number"
                min={priceBounds.min}
                max={priceBounds.max}
                step="100"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                aria-label="Цена от"
                placeholder={String(priceBounds.min)}
              />
              <Input
                type="number"
                min={priceBounds.min}
                max={priceBounds.max}
                step="100"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                aria-label="Цена до"
                placeholder={String(priceBounds.max)}
              />
            </div>
          </fieldset>

          <fieldset className="catalog-characteristics">
            <legend>Характеристики</legend>
            {category === 'all' ? (
              <p>Выберите категорию, чтобы увидеть подходящие характеристики.</p>
            ) : (
              characteristicFilters.map((filter, index) => (
                <div className="catalog-control" key={filter.key}>
                  <label htmlFor={`catalog-characteristic-${index}`}>{filter.key}</label>
                  <NativeSelect
                    id={`catalog-characteristic-${index}`}
                    value={characteristics[filter.key] ?? ''}
                    onChange={(event) => setCharacteristics((current) => ({
                      ...current,
                      [filter.key]: event.target.value,
                    }))}
                  >
                    <NativeSelectOption value="">Все значения</NativeSelectOption>
                    {filter.values.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              ))
            )}
          </fieldset>
        </div>

        <div className="catalog-controls__footer">
          <p className="catalog-results" role="status" aria-live="polite">
            Найдено: <strong>{visibleProducts.length}</strong> из {products.length}
          </p>
          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          )}
        </div>
      </div>

      {visibleProducts.length > 0 ? (
        <>
          <div id="catalog-results-grid">
            <CatalogGrid products={productsToRender} />
          </div>
          {hasMore && (
            <div className="catalog-load-more" ref={loadMoreRef} data-catalog-load-more-region>
              <Button
                type="button"
                variant="outline"
                data-catalog-load-more
                aria-controls="catalog-results-grid"
                onClick={() => setVisibleCount((current) => Math.min(current + pageSize, visibleProducts.length))}
              >
                Показать ещё
              </Button>
              <p role="status" aria-live="polite">
                Показано {productsToRender.length} из {visibleProducts.length}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="catalog-empty" role="status" aria-live="polite">
          <p className="catalog-eyebrow">НЕТ РЕЗУЛЬТАТОВ</p>
          <h3>По вашему запросу ничего не найдено.</h3>
          <p>Измените условия поиска или сбросьте фильтры.</p>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Показать все товары
          </Button>
        </div>
      )}
    </>
  )
}
