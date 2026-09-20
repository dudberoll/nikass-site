import { useEffect, useMemo, useState } from "react";

import { ALL_PRODUCTS_LABEL, AVAILABILITY_LABELS, formatPrice, HERO_CATEGORIES, productAvailability, type Product } from "../data/catalog";

type CatalogCategory = (typeof HERO_CATEGORIES)[number];

export default function CatalogExplorer({ products, categories }: { products: Product[]; categories: ReadonlyArray<CatalogCategory> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") ?? "");
    const requestedCategory = params.get("category") ?? "";
    const requested = categories.find((item) => item.title === requestedCategory || item.label === requestedCategory || item.category === requestedCategory);
    setCategory(requested?.title ?? "");
    setHydrated(true);
  }, [categories]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    const selectedCategory = categories.find((item) => item.title === category);
    return products.filter((product) => (!selectedCategory || product.category === selectedCategory.category)
      && (!normalized || [product.name, product.sku, product.category, product.characteristics].join(" ").toLocaleLowerCase("ru-RU").includes(normalized)))
      .sort((left, right) => sort === "price-asc" ? left.price - right.price
        : sort === "price-desc" ? right.price - left.price
      : sort === "name" ? left.name.localeCompare(right.name, "ru-RU") : products.indexOf(left) - products.indexOf(right));
  }, [categories, category, products, query, sort]);
  const searchSuggestions = [...new Set(products.flatMap(({ name, sku, category }) => [name, sku, category]))];

  return <div data-catalog-hydrated={hydrated}>
    <nav className="catalog-category-buttons" aria-label="Категории товаров">
      <button className={category === "" ? "is-active" : ""} type="button" aria-pressed={category === ""} onClick={() => setCategory("")}>{ALL_PRODUCTS_LABEL}</button>
      {categories.map((item) => <button className={category === item.title ? "is-active" : ""} type="button" aria-pressed={category === item.title} onClick={() => setCategory(category === item.title ? "" : item.title)} key={item.title}>{item.label}</button>)}
    </nav>
    <section className="catalog-toolbar" aria-label="Фильтры каталога">
      <label className="catalog-search"><input type="search" aria-label="Поиск по каталогу" list="catalog-search-suggestions" placeholder="Название или артикул" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <datalist id="catalog-search-suggestions">{searchSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
      <label><select aria-label="Сортировка товаров" value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Хиты продаж</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
    </section>
    <section className="store-product-grid" aria-label="Товары">
      {visible.map((product) => {
        const variant = product.variants[0];
        const availability = productAvailability(product);
        const lowestPrice = Math.min(...product.variants.map((item) => item.price));
        return <article className="store-product-card" data-product-card data-variant-count={product.variants.length} key={product.slug}>
          <a className="store-product-image" href={`/catalog/${product.slug}`}><img src={product.image} alt={product.name} loading="lazy" /></a>
          <div className="store-product-card-body">
            <p className="store-product-category">{product.category}</p>
            <h2><a href={`/catalog/${product.slug}`}>{product.name}</a></h2>
            {product.variants.length > 1 && <p className="store-product-variants">Варианты: {product.variants.length} · <a href={`/catalog/${product.slug}`}>Выбрать вариант</a></p>}
            <span className={`product-availability is-${availability}`}>{AVAILABILITY_LABELS[availability]}</span>
            <div className="store-product-bottom"><strong>{product.variants.length > 1 ? "от " : ""}{formatPrice(lowestPrice)}</strong>{product.variants.length === 1 && variant?.oldPrice && <del>{formatPrice(variant.oldPrice)}</del>}</div>
            <a className="store-add-button" href={`/catalog/${product.slug}`}>Выбрать вариант</a>
          </div>
        </article>;
      })}
    </section>
    {visible.length === 0 && <p className="catalog-no-results">По вашему запросу ничего не найдено.</p>}
  </div>;
}
