import { useEffect, useMemo, useState } from "react";

import { AVAILABILITY_LABELS, formatPrice, shortDescription, type Product } from "../data/catalog";
import { addCartItem, readCart, saveCart } from "../lib/cart";

export default function CatalogExplorer({ products, categories }: { products: Product[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return products.filter((product) => (!category || product.category === category)
      && (!normalized || [product.name, product.sku, product.category, product.characteristics].join(" ").toLocaleLowerCase("ru-RU").includes(normalized)))
      .sort((left, right) => sort === "price-asc" ? left.price - right.price
        : sort === "price-desc" ? right.price - left.price
        : sort === "name" ? left.name.localeCompare(right.name, "ru-RU") : products.indexOf(left) - products.indexOf(right));
  }, [category, products, query, sort]);

  function add(product: Product) {
    const variant = product.variants[0];
    if (!variant || variant.availability === "unavailable") return;
    const stored = readCart();
    if (stored.error) return setMessage("Корзина недоступна: разрешите хранение данных в браузере.");
    const saved = saveCart(addCartItem(stored.items, product, variant.sku));
    setMessage(saved.error ? "Не удалось сохранить корзину." : `${product.name} добавлен в корзину.`);
  }

  return <div data-catalog-hydrated={hydrated}>
    <nav className="catalog-category-buttons" aria-label="Категории товаров">
      {categories.map((item) => <button className={category === item ? "is-active" : ""} type="button" aria-pressed={category === item} onClick={() => setCategory(category === item ? "" : item)} key={item}>{item}</button>)}
    </nav>
    <section className="catalog-toolbar" aria-label="Фильтры каталога">
      <label className="catalog-search"><span>Поиск</span><input type="search" aria-label="Поиск по каталогу" placeholder="Название или артикул" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label><span>Сортировка</span><select aria-label="Сортировка товаров" value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Хиты продаж</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
    </section>
    <p className="store-status-message" role="status" aria-live="polite">{message}</p>
    <section className="store-product-grid" aria-label="Товары">
      {visible.map((product) => {
        const variant = product.variants[0];
        return <article className="store-product-card" data-product-card key={product.slug}>
          <a className="store-product-image" href={`/catalog/${product.slug}`}><img src={product.image} alt={product.name} loading="lazy" /></a>
          <div className="store-product-card-body">
            <p className="store-product-category">{product.category}</p>
            <h2><a href={`/catalog/${product.slug}`}>{product.name}</a></h2>
            <p className="store-product-description">{shortDescription(product)}</p>
            <span className={`product-availability is-${variant.availability}`}>{AVAILABILITY_LABELS[variant.availability]}</span>
            <div className="store-product-bottom"><strong>{formatPrice(variant.price)}</strong>{variant.oldPrice && <del>{formatPrice(variant.oldPrice)}</del>}</div>
            <button className="store-add-button" type="button" disabled={variant.availability === "unavailable"} onClick={() => add(product)}>{variant.availability === "preorder" ? "Оформить предзаказ" : variant.availability === "unavailable" ? "Недоступен" : "Добавить в корзину"}</button>
          </div>
        </article>;
      })}
    </section>
    {visible.length === 0 && <p className="catalog-no-results">По вашему запросу ничего не найдено.</p>}
  </div>;
}
