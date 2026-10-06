import { useEffect, useMemo, useRef, useState } from "react";

import {
  createDraftVariant,
  createEssDraftProduct,
  defaultCardDescription,
  emptyCatalogEdits,
  loadCatalogEdits,
  parseCatalogEdits,
  rowsForVariant,
  CATALOG_EDITS_KEY,
  type CatalogEdits,
  type CharacteristicRow,
  type DraftProduct,
  type DraftVariant,
} from "../data/catalog-editor";
import { formatPrice, type Product } from "../data/catalog";

const CHANGE_EVENT = "nikass:catalog-edits-change";

type CatalogEntry =
  | { key: string; type: "catalog"; product: Product }
  | { key: string; type: "draft"; product: DraftProduct };

export default function CatalogEditor({ products }: { products: Product[] }) {
  const [ready, setReady] = useState(false);
  const [edits, setEdits] = useState<CatalogEdits>(emptyCatalogEdits);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState(products[0] ? `catalog:${products[0].slug}` : "");
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadCatalogEdits(products);
    setEdits(loaded.edits);
    setBlocked(Boolean(loaded.error));
    setMessage(loaded.error ?? "Правки сохраняются в этом браузере. Новые ESS-карточки попадут в JSON-файл.");
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

  const entries = useMemo<CatalogEntry[]>(() => [
    ...products.map((product) => ({ key: `catalog:${product.slug}`, type: "catalog" as const, product })),
    ...edits.newProducts.map((product) => ({ key: `draft:${product.id}`, type: "draft" as const, product })),
  ], [products, edits.newProducts]);
  const entry = entries.find((item) => item.key === selectedProductKey) ?? entries[0];
  const product = entry?.type === "catalog" ? entry.product : undefined;
  const draft = entry?.type === "draft" ? entry.product : undefined;
  const variants = product?.variants ?? draft?.variants ?? [];
  const draftVariant = draft?.variants[selectedVariantIndex] ?? draft?.variants[0];
  const productVariant = product?.variants[selectedVariantIndex] ?? product?.variants[0];
  const variant = draftVariant ?? productVariant;
  const productEdit = product ? edits.products[product.slug] ?? {} : {};
  const cardDescription = draft?.cardDescription ?? productEdit.cardDescription ?? (product ? defaultCardDescription(product) : "");
  const rows: CharacteristicRow[] = draft ? draftVariant?.characteristics ?? [] : product && productVariant ? rowsForVariant(product, productVariant.sku, edits) : [];
  const visibleEntries = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru-RU");
    return entries.filter((item) => {
      const title = item.type === "catalog" ? item.product.name : item.product.name || "Новая карточка ESS";
      const skus = item.product.variants.map((variant) => variant.sku).join(" ");
      return !term || `${title} ${item.product.category} ${skus}`.toLocaleLowerCase("ru-RU").includes(term);
    });
  }, [entries, query]);

  useEffect(() => setSelectedVariantIndex(0), [entry?.key]);

  if (!ready) return <p className="catalog-editor-loading">Открываем каталог…</p>;
  if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return <p className="catalog-editor-loading">Редактор открывается только в локальной копии сайта.</p>;
  }

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

  function updateCatalogProduct(changes: Partial<NonNullable<CatalogEdits["products"][string]>>) {
    if (!product) return;
    commit({ ...edits, products: { ...edits.products, [product.slug]: { ...productEdit, ...changes } } });
  }

  function updateDraftProduct(changes: Partial<DraftProduct>) {
    if (!draft) return;
    commit({ ...edits, newProducts: edits.newProducts.map((item) => item.id === draft.id ? { ...draft, ...changes } : item) });
  }

  function updateDraftVariant(changes: Partial<DraftVariant>) {
    if (!draft || !variant) return;
    updateDraftProduct({ variants: draft.variants.map((item, index) => index === selectedVariantIndex ? { ...item, ...changes } : item) });
  }

  function updateCardDescription(value: string) {
    if (draft) updateDraftProduct({ cardDescription: value });
    else updateCatalogProduct({ cardDescription: value });
  }

  function updateRows(nextRows: CharacteristicRow[]) {
    if (draft) updateDraftVariant({ characteristics: nextRows });
    else if (product && variant) updateCatalogProduct({ characteristics: { ...productEdit.characteristics, [variant.sku]: nextRows } });
  }

  function addDraftProduct() {
    const next = createEssDraftProduct(crypto.randomUUID());
    commit({ ...edits, newProducts: [...edits.newProducts, next] });
    setSelectedProductKey(`draft:${next.id}`);
  }

  function addDraftVariant() {
    if (!draft) return;
    const next = createDraftVariant(crypto.randomUUID());
    updateDraftProduct({ variants: [...draft.variants, next] });
    setSelectedVariantIndex(draft.variants.length);
  }

  function removeDraftProduct() {
    if (!draft || !window.confirm(`Удалить черновик «${draft.name || "Новая карточка ESS"}»?`)) return;
    commit({ ...edits, newProducts: edits.newProducts.filter((item) => item.id !== draft.id) });
    setSelectedProductKey(products[0] ? `catalog:${products[0].slug}` : `draft:${edits.newProducts.find((item) => item.id !== draft.id)?.id ?? ""}`);
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("Файл слишком большой. Выберите JSON-файл до 10 МБ.");
      const parsed = parseCatalogEdits(JSON.parse(await file.text()), products);
      commit(parsed);
      setSelectedProductKey(parsed.newProducts[0] ? `draft:${parsed.newProducts[0].id}` : products[0] ? `catalog:${products[0].slug}` : "");
      setMessage("Файл загружен и сохранён в этом браузере.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось прочитать JSON-файл.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function exportFile() {
    try {
      const parsed = parseCatalogEdits(edits, products);
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "nikass-catalog-edits.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить JSON-файл.");
    }
  }

  function reset() {
    if (!window.confirm("Удалить все локальные правки и ESS-черновики?")) return;
    try {
      localStorage.removeItem(CATALOG_EDITS_KEY);
      localStorage.removeItem("nikass.catalog-edits.v1");
      setEdits(emptyCatalogEdits);
      setBlocked(false);
      setSelectedProductKey(products[0] ? `catalog:${products[0].slug}` : "");
      setMessage("Локальные правки удалены.");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setMessage("Не удалось удалить сохранение браузера.");
    }
  }

  return <section className="catalog-editor" aria-label="Редактор каталога">
    <div className="catalog-editor-actions">
      <p className="catalog-editor-status" role={/^(Не удалось|Файл|В файле|Артикул)/.test(message) ? "alert" : "status"}>{message}</p>
      <div className="catalog-editor-action-buttons">
        <label className="catalog-editor-button catalog-editor-import-button">
          <input ref={fileInput} className="catalog-editor-file-input" type="file" accept="application/json,.json" onChange={(event) => void importFile(event.currentTarget.files?.[0])} />
          <span>Импортировать JSON</span>
        </label>
        <button className="catalog-editor-button catalog-editor-button-primary" type="button" onClick={exportFile} disabled={blocked}>Скачать JSON</button>
        <button className="catalog-editor-button catalog-editor-button-quiet" type="button" onClick={reset}>Сбросить</button>
      </div>
    </div>

    <div className="catalog-editor-layout">
      <aside className="catalog-editor-sidebar" aria-label="Список товаров">
        <label className="catalog-editor-search-label" htmlFor="catalog-editor-search">Найти товар</label>
        <input id="catalog-editor-search" className="catalog-editor-search" type="search" placeholder="Название или артикул" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="catalog-editor-add-button" type="button" disabled={blocked} onClick={addDraftProduct}>+ Добавить товар ESS</button>
        <div className="catalog-editor-product-list">
          {visibleEntries.map((item) => {
            const title = item.type === "catalog" ? item.product.name : item.product.name || "Новая карточка ESS";
            return <button
              className={`catalog-editor-product-choice${item.key === entry?.key ? " is-selected" : ""}`}
              type="button"
              aria-pressed={item.key === entry?.key}
              onClick={() => setSelectedProductKey(item.key)}
              key={item.key}
            >
              <span className="catalog-editor-product-choice-category">{item.product.category}{item.type === "draft" ? " · ЧЕРНОВИК" : ""}</span>
              <span>{title}</span>
            </button>;
          })}
          {visibleEntries.length === 0 && <p className="catalog-editor-empty">Ничего не найдено.</p>}
        </div>
      </aside>

      {entry && variant ? <div className="catalog-editor-workspace">
        <section className="catalog-editor-form" aria-labelledby="catalog-editor-product-title">
          <div className="catalog-editor-product-heading">
            <p className="store-eyebrow">{draft?.category ?? product?.category}</p>
            <h2 id="catalog-editor-product-title">{draft?.name || product?.name || "Новая карточка ESS"}</h2>
            {draft && <>
              <label className="catalog-editor-field-label" htmlFor="catalog-editor-product-name">Название товара</label>
              <input id="catalog-editor-product-name" className="catalog-editor-search" maxLength={300} value={draft.name} disabled={blocked} onChange={(event) => updateDraftProduct({ name: event.target.value })} />
              <button className="catalog-editor-button catalog-editor-button-quiet" type="button" disabled={blocked} onClick={removeDraftProduct}>Удалить карточку</button>
            </>}
            {variants.length > 1 && <label className="catalog-editor-variant-label" htmlFor="catalog-editor-variant">
              Вариант / подкатегория
              <select id="catalog-editor-variant" value={selectedVariantIndex} onChange={(event) => setSelectedVariantIndex(Number(event.target.value))}>
                {variants.map((item, index) => <option value={index} key={"id" in item ? item.id : item.sku}>{item.label || item.sku || `Вариант ${index + 1}`}</option>)}
              </select>
            </label>}
          </div>

          {draft && <>
            <div className="catalog-editor-row">
              <label htmlFor="catalog-editor-image">Фотография (ссылка или путь)</label>
              <input id="catalog-editor-image" maxLength={2_000} value={draft.image} disabled={blocked} onChange={(event) => updateDraftProduct({ image: event.target.value })} />
            </div>
            <label className="catalog-editor-field-label" htmlFor="catalog-editor-full-description">Описание товара</label>
            <textarea id="catalog-editor-full-description" className="catalog-editor-textarea" maxLength={5_000} rows={5} value={draft.description} disabled={blocked} onChange={(event) => updateDraftProduct({ description: event.target.value })} />
            <label className="catalog-editor-field-label" htmlFor="catalog-editor-package">Комплектация</label>
            <textarea id="catalog-editor-package" className="catalog-editor-textarea" maxLength={5_000} rows={3} value={draft.packageContents} disabled={blocked} onChange={(event) => updateDraftProduct({ packageContents: event.target.value })} />
            <div className="catalog-editor-row">
              <label htmlFor="catalog-editor-sku">Артикул</label>
              <input id="catalog-editor-sku" maxLength={120} value={variant.sku} disabled={blocked} onChange={(event) => updateDraftVariant({ sku: event.target.value })} />
              <label htmlFor="catalog-editor-variant-label">Вариант / подкатегория</label>
              <div className="catalog-editor-value-control">
                <input id="catalog-editor-variant-label" maxLength={240} value={variant.label} disabled={blocked} onChange={(event) => updateDraftVariant({ label: event.target.value })} />
                <button className="catalog-editor-remove-button" type="button" aria-label="Удалить вариант" disabled={blocked || draft.variants.length <= 1} onClick={() => {
                  if (draft.variants.length <= 1) return;
                  const next = draft.variants.filter((_, index) => index !== selectedVariantIndex);
                  updateDraftProduct({ variants: next });
                  setSelectedVariantIndex(Math.min(selectedVariantIndex, next.length - 1));
                }}>×</button>
              </div>
              <label htmlFor="catalog-editor-price">Цена</label>
              <input id="catalog-editor-price" type="number" min="0" step="0.01" value={variant.price ?? ""} disabled={blocked} onChange={(event) => updateDraftVariant({ price: event.target.value === "" ? null : Number(event.target.value) })} />
              <label htmlFor="catalog-editor-old-price">Старая цена</label>
              <input id="catalog-editor-old-price" type="number" min="0" step="0.01" value={variant.oldPrice ?? ""} disabled={blocked} onChange={(event) => updateDraftVariant({ oldPrice: event.target.value === "" ? null : Number(event.target.value) })} />
              <label htmlFor="catalog-editor-availability">Наличие</label>
              <select id="catalog-editor-availability" value={variant.availability ?? ""} disabled={blocked} onChange={(event) => updateDraftVariant({ availability: (event.target.value || null) as DraftVariant["availability"] })}>
                <option value="">Не указано</option>
                <option value="in-stock">В наличии</option>
                <option value="preorder">Предзаказ</option>
                <option value="unavailable">Нет в наличии</option>
              </select>
            </div>
          </>}

          <label className="catalog-editor-field-label" htmlFor="catalog-editor-description">Короткое описание карточки</label>
          <textarea
            id="catalog-editor-description"
            className="catalog-editor-textarea"
            maxLength={240}
            rows={3}
            value={cardDescription}
            disabled={blocked}
            onChange={(event) => updateCardDescription(event.target.value)}
          />
          <p className="catalog-editor-help">Покажется под названием товара в каталоге · {cardDescription.length}/240</p>

          <div className="catalog-editor-characteristics-heading">
            <div><h3>Характеристики{draft && variant.label ? ` · ${variant.label}` : ""}</h3><p>Название и значение каждой строки можно изменить.</p></div>
            <div className="catalog-editor-action-buttons">
              {draft && <button className="catalog-editor-add-button" type="button" disabled={blocked} onClick={addDraftVariant}>+ Вариант / подкатегория</button>}
              <button className="catalog-editor-add-button" type="button" disabled={blocked} onClick={() => updateRows([...rows, { label: "", value: "" }])}>+ Добавить характеристику</button>
            </div>
          </div>
          {blocked && <p className="catalog-editor-blocked-note">Сначала импортируйте сохранённый файл или сбросьте локальные правки.</p>}
          <div className="catalog-editor-rows">
            {rows.map((row, index) => {
              const readOnly = !draft && /^(?:артикул|дополнительные артикулы|\d{5,})$/i.test(row.label.trim());
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
            <div className="store-product-image"><img src={draft?.image || product?.image || "/assets/images/category-icons/energy-storage-ess.png"} alt={draft?.name || product?.name || "Новая карточка ESS"} /></div>
            <div className="store-product-card-body">
              <p className="store-product-category">{draft?.category ?? product?.category}</p>
              <h3>{draft?.name || product?.name || "Новая карточка ESS"}</h3>
              <p className="store-product-card-description">{cardDescription || "Добавьте короткое описание."}</p>
              <div className="store-product-bottom"><strong>{typeof variant.price === "number" ? formatPrice(variant.price) : "Цена не указана"}</strong></div>
            </div>
          </article>
          <h3 className="catalog-editor-preview-specs-title">Характеристики · {variant.label || variant.sku || `Вариант ${selectedVariantIndex + 1}`}</h3>
          <dl className="catalog-editor-preview-specs">
            {rows.filter((row) => row.label || row.value).map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl>
        </aside>
      </div> : <p className="catalog-editor-empty">Пока нет товаров. Добавьте первый черновик ESS.</p>}
    </div>
  </section>;
}
