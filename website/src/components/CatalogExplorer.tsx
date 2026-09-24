import { useEffect, useMemo, useState } from "react";

import { emptyCatalogEdits, loadCatalogEdits } from "../data/catalog-editor";
import { ALL_PRODUCTS_LABEL, AVAILABILITY_LABELS, formatPrice, getSelectedVariant, HERO_CATEGORIES, productAvailability, type Product } from "../data/catalog";

type CatalogCategory = (typeof HERO_CATEGORIES)[number];

export default function CatalogExplorer({ products, categories }: { products: Product[]; categories: ReadonlyArray<CatalogCategory> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [hydrated, setHydrated] = useState(false);
  const [edits, setEdits] = useState(emptyCatalogEdits);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") ?? "");
    const requestedCategory = params.get("category") ?? "";
    const requested = categories.find((item) => item.title === requestedCategory || item.label === requestedCategory || item.category === requestedCategory
      || (item.category === "Инвертора напряжения" && ["Инвертор напряжения", "Автомобильные инверторы", "АВТОМОБИЛЬНЫЕ ИНВЕРТОРЫ"].includes(requestedCategory))
      || (item.category === "LiFePO₄ аккумуляторы" && requestedCategory === "LiFePO4 аккумуляторы"));
    setCategory(requested?.title ?? "");
    const syncEdits = () => setEdits(loadCatalogEdits(products).edits);
    syncEdits();
    window.addEventListener("storage", syncEdits);
    return () => window.removeEventListener("storage", syncEdits);
  }, [categories, products]);

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
    <nav className="catalog-category-buttons" aria-label="Категории товаров">
      <button className={category === "" ? "is-active" : ""} type="button" aria-pressed={category === ""} onClick={() => setCategory("")}>{ALL_PRODUCTS_LABEL}</button>
      {categories.map((item) => <button className={category === item.title ? "is-active" : ""} type="button" aria-pressed={category === item.title} onClick={() => setCategory(category === item.title ? "" : item.title)} key={item.title}>{item.label}</button>)}
    </nav>
    <section className="catalog-toolbar" aria-label="Фильтры каталога">
      <label className="catalog-search"><input type="search" aria-label="Поиск по каталогу" list="catalog-search-suggestions" placeholder="Поиск" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <datalist id="catalog-search-suggestions">{searchSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
      <label><select aria-label="Сортировка товаров" value={sort} onChange={(event) => setSort(event.target.value)}><option value="default">Хиты продаж</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
    </section>
    <section className="store-product-grid" aria-label="Товары">
      {visible.map((product) => {
        const variant = getSelectedVariant(product, selectedVariants[product.slug]);
        const availability = selectedVariants[product.slug] ? variant?.availability ?? productAvailability(product) : productAvailability(product);
        const lowestPrice = Math.min(...product.variants.map((item) => item.price));
        const description = edits.products[product.slug]?.cardDescription ?? "";
        const productHref = `/catalog/${product.slug}${selectedVariants[product.slug] ? `?variant=${encodeURIComponent(selectedVariants[product.slug])}` : ""}`;
        const variantsExpanded = expandedVariantGroups[product.slug] ?? false;
        const moreVariantsOnDesktop = product.variants.length > 4;
        const moreVariantsOnPhone = product.variants.length > 2;
        return <article className="store-product-card" data-product-card data-variant-count={product.variants.length} key={product.slug}>
          <a className="store-product-image" href={productHref}><img src={product.image} alt={product.name} loading="lazy" /></a>
          <div className="store-product-card-body">
            <p className="store-product-category">{product.category}</p>
            <h2><a href={productHref}>{product.name}</a></h2>
            {description && <p className="store-product-card-description">{description}</p>}
            {product.variants.length > 1 && <>
              <p className="store-product-variant-label">Выберите вариант</p>
              <div id={`product-variants-${product.slug}`} className={`store-product-variant-options${variantsExpanded ? "" : " is-collapsed"}`} role="group" aria-label={`Варианты товара ${product.name}`}>
                {product.variants.map((item) => <button type="button" className={`store-product-variant-choice${item.sku === selectedVariants[product.slug] ? " is-selected" : ""}`} aria-label={`${item.label}, ${formatPrice(item.price)}`} aria-pressed={item.sku === selectedVariants[product.slug]} onClick={() => setSelectedVariants((current) => ({ ...current, [product.slug]: item.sku }))} key={item.sku}>
                  <img src={product.image} alt="" loading="lazy" />
                  <span>{item.label}</span>
                </button>)}
                {moreVariantsOnPhone && <button type="button" className={`store-product-variant-more${moreVariantsOnDesktop ? " is-visible-desktop" : ""} is-visible-phone`} aria-controls={`product-variants-${product.slug}`} aria-expanded={variantsExpanded} onClick={() => setExpandedVariantGroups((current) => ({ ...current, [product.slug]: !variantsExpanded }))}>
                  <span className="store-product-variant-more-count">
                    {variantsExpanded ? "−" : <><span className="store-product-variant-more-count-desktop">+{product.variants.length - 4}</span><span className="store-product-variant-more-count-phone">+{product.variants.length - 2}</span></>}
                  </span>
                  <span className="store-product-variant-more-label">{variantsExpanded ? "Свернуть" : "Ещё"}</span>
                </button>}
              </div>
            </>}
            <span className={`product-availability is-${availability}`}>{AVAILABILITY_LABELS[availability]}</span>
            <div className="store-product-bottom"><strong>{product.variants.length > 1 && !selectedVariants[product.slug] ? "от " : ""}{formatPrice(selectedVariants[product.slug] && variant ? variant.price : lowestPrice)}</strong>{variant?.oldPrice && (product.variants.length === 1 || selectedVariants[product.slug]) && <del>{formatPrice(variant.oldPrice)}</del>}</div>
            <a className="store-add-button" href={productHref}>Выбрать вариант</a>
          </div>
        </article>;
      })}
    </section>
    {visible.length === 0 && <p className="catalog-no-results">По вашему запросу ничего не найдено.</p>}
  </div>;
}
