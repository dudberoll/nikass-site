import { useState } from "react";
import { AVAILABILITY_LABELS, formatVariantPrice, getProductPrice, getSelectedVariant, productAvailability, type Product } from "../data/catalog";
import RestockRequest from "./RestockRequest";

export default function ProductCard({ product, appearance = "catalog" }: { product: Product; appearance?: "catalog" | "bestseller" }) {
  const [selectedSku, setSelectedSku] = useState<string>();
  const [variantsExpanded, setExpanded] = useState(false);
  const bestseller = appearance === "bestseller";
  const Heading = bestseller ? "h3" : "h2";
  const variant = getSelectedVariant(product, selectedSku);
  const availability = selectedSku ? variant?.availability ?? productAvailability(product) : productAvailability(product);
  const price = getProductPrice(product, selectedSku);
  const description = product.cardDescription ?? "";
  const productHref = `/catalog/${product.slug}${selectedSku ? `?variant=${encodeURIComponent(selectedSku)}` : ""}`;
  const moreVariantsOnDesktop = product.variants.length > 4;
  const moreVariantsOnPhone = product.variants.length > 2;
  return <article className={bestseller ? "orbea-bestseller-card" : "store-product-card"} data-product-card data-variant-count={product.variants.length}>
    <a className={bestseller ? "orbea-bestseller-image" : "store-product-image"} href={productHref}><img src={variant?.image ?? product.image} alt={product.name} loading="lazy" /></a>
    <div className={bestseller ? "orbea-bestseller-copy" : "store-product-card-body"}>
      <p className="store-product-category">{product.category}</p>
      {product.demo && <p className="store-product-card-description">Тестовый экземпляр</p>}
      <Heading><a href={productHref}>{product.name}</a></Heading>
      {!bestseller && description && <p className="store-product-card-description">{description}</p>}
      {product.variants.length > 1 && <>
        <p className="store-product-variant-label">Выберите вариант</p>
        <div id={`product-variants-${product.slug}`} className={`store-product-variant-options${variantsExpanded ? "" : " is-collapsed"}`} role="group" aria-label={`Варианты товара ${product.name}`}>
          {product.variants.map((item) => <button type="button" className={`store-product-variant-choice${item.sku === selectedSku ? " is-selected" : ""}`} aria-label={`${item.label}, ${formatVariantPrice(item)}`} aria-pressed={item.sku === selectedSku} onClick={() => setSelectedSku(item.sku)} key={item.sku}>
            <img src={item.image ?? product.image} alt="" loading="lazy" />
            <span>{item.label}</span>
          </button>)}
          {moreVariantsOnPhone && <button type="button" className={`store-product-variant-more${moreVariantsOnDesktop ? " is-visible-desktop" : ""} is-visible-phone`} aria-label={variantsExpanded ? "Свернуть варианты" : "Показать ещё варианты"} aria-controls={`product-variants-${product.slug}`} aria-expanded={variantsExpanded} onClick={() => setExpanded(!variantsExpanded)}>
            <span className="store-product-variant-more-count">
              {variantsExpanded ? "−" : <><span className="store-product-variant-more-count-desktop">+{product.variants.length - 4}</span><span className="store-product-variant-more-count-phone">+{product.variants.length - 2}</span></>}
            </span>
            <span className="store-product-variant-more-label">{variantsExpanded ? "Свернуть" : "Ещё"}</span>
          </button>}
        </div>
      </>}
      <span className={`product-availability is-${availability}`}>{AVAILABILITY_LABELS[availability]}</span>
      <div className={bestseller ? "store-product-bottom orbea-bestseller-price" : "store-product-bottom"}><strong>{price.label}</strong>{price.oldPriceLabel && <del>{price.oldPriceLabel}</del>}</div>
      {variant?.availability === "preorder" && (product.variants.length === 1 || selectedSku)
        ? <RestockRequest product={product} variant={variant} key={variant.sku} />
        : <a className="store-add-button" href={productHref}>Выбрать вариант</a>}
    </div>
  </article>;
}
