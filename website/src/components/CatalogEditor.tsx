import { useEffect, useMemo, useRef, useState } from "react";

import {
  defaultCardDescription,
  emptyCatalogEdits,
  loadCatalogEdits,
  parseCatalogEdits,
  rowsForVariant,
  CATALOG_EDITS_KEY,
  type CatalogEdits,
  type CharacteristicRow,
} from "../data/catalog-editor";
import { formatPrice, type Product } from "../data/catalog";

const CHANGE_EVENT = "nikass:catalog-edits-change";

export default function CatalogEditor({ products }: { products: Product[] }) {
  const [ready, setReady] = useState(false);
  const [edits, setEdits] = useState<CatalogEdits>(emptyCatalogEdits);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(products[0]?.slug ?? "");
  const [selectedSku, setSelectedSku] = useState(products[0]?.variants[0]?.sku ?? "");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadCatalogEdits(products);
    setEdits(loaded.edits);
    setBlocked(Boolean(loaded.error));
    setMessage(loaded.error ?? "Изменения автоматически сохраняются в этом браузере.");
    setReady(true);

    const sync = () => {
      const next = loadCatalogEdits(products);
      setEdits(next.edits);
      setBlocked(Boolean(next.error));
      setMessage(next.error ?? "Изменения загружены.");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [products]);

  const product = products.find((item) => item.slug === selectedSlug) ?? products[0];
  const variant = product?.variants.find((item) => item.sku === selectedSku) ?? product?.variants[0];
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru-RU");
    return products.filter((item) => !term || `${item.name} ${item.category} ${item.sku}`.toLocaleLowerCase("ru-RU").includes(term));
  }, [products, query]);

  useEffect(() => {
    setSelectedSku(product?.variants[0]?.sku ?? "");
  }, [product?.slug]);

  if (!ready) return <p className="catalog-editor-loading">Открываем каталог…</p>;
  if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return <p className="catalog-editor-loading">Редактор открывается только в локальной копии сайта.</p>;
  }
  if (!product || !variant) return <p className="catalog-editor-loading">В каталоге пока нет товаров.</p>;

  const rows = rowsForVariant(product, variant.sku, edits);
  const productEdit = edits.products[product.slug] ?? {};
  const cardDescription = productEdit.cardDescription ?? defaultCardDescription(product);

  function commit(next: CatalogEdits) {
    setEdits(next);
    try {
      localStorage.setItem(CATALOG_EDITS_KEY, JSON.stringify(next));
      setBlocked(false);
      setMessage("Сохранено в этом браузере.");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setMessage("Не удалось сохранить в браузере. Скачайте JSON-файл с правками.");
    }
  }

  function updateProduct(changes: Partial<NonNullable<CatalogEdits["products"][string]>>) {
    commit({ ...edits, products: { ...edits.products, [product.slug]: { ...productEdit, ...changes } } });
  }

  function updateRows(nextRows: CharacteristicRow[]) {
    updateProduct({ characteristics: { ...productEdit.characteristics, [variant.sku]: nextRows } });
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("Файл слишком большой. Выберите JSON-файл до 10 МБ.");
      const parsed = parseCatalogEdits(JSON.parse(await file.text()), products);
      commit(parsed);
      setMessage("Файл загружен и сохранён в этом браузере.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось прочитать JSON-файл.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(edits, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nikass-catalog-edits.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function reset() {
    if (!window.confirm("Удалить все локальные правки каталога?")) return;
    try {
      localStorage.removeItem(CATALOG_EDITS_KEY);
      setEdits(emptyCatalogEdits);
      setBlocked(false);
      setMessage("Локальные правки удалены.");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setMessage("Не удалось удалить сохранение браузера.");
    }
  }

  return <section className="catalog-editor" aria-label="Редактор каталога">
    <div className="catalog-editor-actions">
      <p className="catalog-editor-status" role={message.startsWith("Не удалось") || message.startsWith("Файл") || message.startsWith("В файле") ? "alert" : "status"}>{message}</p>
      <div className="catalog-editor-action-buttons">
        <label className="catalog-editor-button catalog-editor-import-button">
          <input ref={fileInput} className="catalog-editor-file-input" type="file" accept="application/json,.json" onChange={(event) => void importFile(event.currentTarget.files?.[0])} />
          <span>Импортировать JSON</span>
        </label>
        <button className="catalog-editor-button catalog-editor-button-primary" type="button" onClick={exportFile} disabled={blocked}>Скачать правки</button>
        <button className="catalog-editor-button catalog-editor-button-quiet" type="button" onClick={reset}>Сбросить</button>
      </div>
    </div>

    <div className="catalog-editor-layout">
      <aside className="catalog-editor-sidebar" aria-label="Список товаров">
        <label className="catalog-editor-search-label" htmlFor="catalog-editor-search">Найти товар</label>
        <input id="catalog-editor-search" className="catalog-editor-search" type="search" placeholder="Название или категория" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="catalog-editor-product-list">
          {visibleProducts.map((item) => <button
            className={`catalog-editor-product-choice${item.slug === product.slug ? " is-selected" : ""}`}
            type="button"
            aria-pressed={item.slug === product.slug}
            onClick={() => setSelectedSlug(item.slug)}
            key={item.slug}
          >
            <span className="catalog-editor-product-choice-category">{item.category}</span>
            <span>{item.name}</span>
          </button>)}
          {visibleProducts.length === 0 && <p className="catalog-editor-empty">Ничего не найдено.</p>}
        </div>
      </aside>

      <div className="catalog-editor-workspace">
        <section className="catalog-editor-form" aria-labelledby="catalog-editor-product-title">
          <div className="catalog-editor-product-heading">
            <p className="store-eyebrow">{product.category}</p>
            <h2 id="catalog-editor-product-title">{product.name}</h2>
            {product.variants.length > 1 && <label className="catalog-editor-variant-label" htmlFor="catalog-editor-variant">
              Вариант товара
              <select id="catalog-editor-variant" value={variant.sku} onChange={(event) => setSelectedSku(event.target.value)}>
                {product.variants.map((item) => <option value={item.sku} key={item.sku}>{item.label || item.sku}</option>)}
              </select>
            </label>}
          </div>

          <label className="catalog-editor-field-label" htmlFor="catalog-editor-description">Короткое описание карточки</label>
          <textarea
            id="catalog-editor-description"
            className="catalog-editor-textarea"
            maxLength={240}
            rows={3}
            value={cardDescription}
            disabled={blocked}
            onChange={(event) => updateProduct({ cardDescription: event.target.value })}
          />
          <p className="catalog-editor-help">Покажется под названием товара в каталоге · {cardDescription.length}/240</p>

          <div className="catalog-editor-characteristics-heading">
            <div><h3>Характеристики</h3><p>Название и значение каждой строки можно изменить.</p></div>
            <button className="catalog-editor-add-button" type="button" disabled={blocked} onClick={() => updateRows([...rows, { label: "", value: "" }])}>+ Добавить</button>
          </div>
          {blocked && <p className="catalog-editor-blocked-note">Сначала импортируйте сохранённый файл или сбросьте локальные правки.</p>}
          <div className="catalog-editor-rows">
            {rows.map((row, index) => {
              const readOnly = /^(?:артикул|дополнительные артикулы|\d{5,})$/i.test(row.label.trim());
              return <div className={`catalog-editor-row${readOnly ? " is-read-only" : ""}`} key={`${variant.sku}-${index}`}>
                <label htmlFor={`catalog-editor-label-${index}`}>Название характеристики</label>
                <input id={`catalog-editor-label-${index}`} maxLength={300} value={row.label} readOnly={readOnly} disabled={blocked} onChange={(event) => updateRows(rows.map((item, rowIndex) => rowIndex === index ? { ...item, label: event.target.value } : item))} />
                <label htmlFor={`catalog-editor-value-${index}`}>Значение</label>
                <div className="catalog-editor-value-control">
                  <input id={`catalog-editor-value-${index}`} maxLength={2_000} value={row.value} readOnly={readOnly} disabled={blocked} onChange={(event) => updateRows(rows.map((item, rowIndex) => rowIndex === index ? { ...item, value: event.target.value } : item))} />
                  <button className="catalog-editor-remove-button" type="button" aria-label={`Удалить характеристику ${row.label || index + 1}`} disabled={blocked || readOnly} onClick={() => updateRows(rows.filter((_, rowIndex) => rowIndex !== index))}>×</button>
                </div>
              </div>;
            })}
            {rows.length === 0 && <p className="catalog-editor-empty">Характеристик пока нет. Добавьте первую строку.</p>}
          </div>
        </section>

        <aside className="catalog-editor-preview" aria-label="Предпросмотр карточки и характеристик">
          <p className="catalog-editor-preview-heading">Предпросмотр</p>
          <article className="store-product-card catalog-editor-preview-card">
            <div className="store-product-image"><img src={product.image} alt={product.name} /></div>
            <div className="store-product-card-body">
              <p className="store-product-category">{product.category}</p>
              <h3>{product.name}</h3>
              <p className="store-product-card-description">{cardDescription}</p>
              <div className="store-product-bottom"><strong>{formatPrice(variant.price)}</strong></div>
            </div>
          </article>
          <h3 className="catalog-editor-preview-specs-title">Характеристики · {variant.label || variant.sku}</h3>
          <dl className="catalog-editor-preview-specs">
            {rows.filter((row) => row.label || row.value).map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl>
        </aside>
      </div>
    </div>
  </section>;
}
