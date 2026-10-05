import { useEffect, useMemo, useState } from "react";

import { ALL_PRODUCTS_LABEL, DISCOUNTED_PRODUCTS_LABEL, DISCOUNTED_PRODUCTS_PATH, HERO_CATEGORIES, type Product } from "../data/catalog";
import ProductCard from "./ProductCard";

type CatalogCategory = (typeof HERO_CATEGORIES)[number];

export default function CatalogExplorer({ products, categories, discounted = false }: { products: Product[]; categories: ReadonlyArray<CatalogCategory>; discounted?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") ?? "");
    const requestedCategory = params.get("category") ?? "";
    const requested = categories.find((item) => item.title === requestedCategory || item.label === requestedCategory || item.category === requestedCategory
      || (item.category === "Инверторы напряжения" && ["Инвертора напряжения", "ИНВЕРТОРА НАПРЯЖЕНИЯ", "Инвертор напряжения", "Автомобильные инверторы", "АВТОМОБИЛЬНЫЕ ИНВЕРТОРЫ"].includes(requestedCategory))
      || (item.category === "Системы хранения энергии" && ["Системы хранения энергии ESS", "СИСТЕМЫ ХРАНЕНИЯ ЭНЕРГИИ ESS"].includes(requestedCategory))
      || (item.category === "LiFePO₄ аккумуляторы" && requestedCategory === "LiFePO4 аккумуляторы"));
    setCategory(discounted ? "" : requested?.title ?? "");
  }, [categories, products, discounted]);

  useEffect(() => {
    setHydrated(true);
  }, []);

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
    {!discounted && <nav className="catalog-category-buttons" aria-label="Категории товаров">
      <button className={category === "" ? "is-active" : ""} type="button" aria-pressed={category === ""} onClick={() => setCategory("")}>{ALL_PRODUCTS_LABEL}</button>
      {categories.map((item) => <button className={category === item.title ? "is-active" : ""} type="button" aria-pressed={category === item.title} onClick={() => setCategory(category === item.title ? "" : item.title)} key={item.title}>{item.label}</button>)}
      <a href={DISCOUNTED_PRODUCTS_PATH}>{DISCOUNTED_PRODUCTS_LABEL}</a>
    </nav>}
    <section className="catalog-toolbar" aria-label="Фильтры каталога">
      <label className="catalog-search"><input type="search" aria-label="Поиск по каталогу" list="catalog-search-suggestions" placeholder="Поиск" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <datalist id="catalog-search-suggestions">{searchSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
      <label><select aria-label="Сортировка товаров" value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Хиты продаж</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
    </section>
    <section className="store-product-grid" aria-label="Товары">
      {visible.map((product) => {
        return <ProductCard product={product} key={product.slug} />;
      })}
    </section>
    {visible.length === 0 && <p className="catalog-no-results">{discounted && products.length === 0 ? "Уценённых товаров пока нет. Новые предложения появятся здесь." : "По вашему запросу ничего не найдено."}</p>}
  </div>;
}
