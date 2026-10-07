import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVariantSelector from '../src/components/ProductVariantSelector';
import CatalogExplorer from '../src/components/CatalogExplorer';
import type { Product } from '../src/data/catalog';
import { applyProductAvailability } from '../src/lib/catalog-availability';

const product: Product = { slug: 'station', sku: 'S1', name: 'Станция', category: 'Станции', rawCategory: 'stations', price: 100,
  description: '', packageContents: '', characteristics: '', image: '/station.png',
  variants: [{ sku: 'S1', label: '300 Вт', price: 100, availability: 'preorder' }] };
test('preorder offers a restock request instead of a cart or quantity control', () => {
  const markup = renderToStaticMarkup(<ProductVariantSelector product={product} />);
  assert.match(markup, /Сообщить о поступлении/);
  assert.doesNotMatch(markup, /Добавить в корзину|Оформить предзаказ|Увеличить количество/);
  const inStock = renderToStaticMarkup(<ProductVariantSelector product={{ ...product, variants: [{ ...product.variants[0]!, availability: 'in-stock' }] }} />);
  assert.match(inStock, /Добавить в корзину/);
  assert.doesNotMatch(inStock, /Сообщить о поступлении/);
});

test('catalog accepts a request for a single preorder variant and requires a choice for multiple variants', () => {
  const single = renderToStaticMarkup(<CatalogExplorer products={[product]} categories={[]} />);
  assert.match(single, /Сообщить о поступлении/);
  const multiple = renderToStaticMarkup(<CatalogExplorer products={[{ ...product,
    variants: [...product.variants, { ...product.variants[0]!, sku: 'S2', label: '600 Вт' }] }]} categories={[]} />);
  assert.doesNotMatch(multiple, /Сообщить о поступлении/);
  assert.match(multiple, /Выбрать вариант/);
});

test('live availability switches a cached SKU to a restock request without changing its price or identity', () => {
  const cached: Product = { ...product, slug: 'grouped-station', variants: [
    { ...product.variants[0]!, sourceSlug: 'source-station', availability: 'in-stock' },
  ] };
  const before = structuredClone(cached);
  assert.match(renderToStaticMarkup(<ProductVariantSelector product={cached} />), /Добавить в корзину/);
  const sold = applyProductAvailability(cached, new Map([['source-station\0S1', 'preorder']]));
  assert.deepEqual(sold.variants[0], { ...cached.variants[0]!, availability: 'preorder' });
  assert.equal(sold.slug, cached.slug);
  assert.equal(sold.sku, cached.sku);
  assert.equal(sold.price, cached.price);
  assert.equal(sold.variants[0]?.price, cached.variants[0]?.price);
  const markup = renderToStaticMarkup(<ProductVariantSelector product={sold} />);
  assert.match(markup, /Сообщить о поступлении/);
  assert.doesNotMatch(markup, /Добавить в корзину/);
  const restocked = applyProductAvailability(sold, new Map([['source-station\0S1', 'in-stock']]));
  assert.deepEqual(restocked, cached);
  assert.equal(applyProductAvailability(cached, new Map()).variants[0]?.availability, 'unavailable');
  assert.equal(applyProductAvailability(cached, new Map([['grouped-station\0S1', 'preorder']])).variants[0]?.availability, 'unavailable');
  const standalone: Product = { ...cached, slug: 'standalone', variants: [
    { sku: 'S1', label: '300 Вт', price: 100, availability: 'in-stock' },
  ] };
  assert.equal(applyProductAvailability(standalone, new Map([['standalone\0S1', 'preorder']])).variants[0]?.availability, 'preorder');
  assert.equal(applyProductAvailability(cached, null), cached);
  const demo = { ...cached, demo: true };
  assert.equal(applyProductAvailability(demo, new Map()), demo);
  assert.deepEqual(cached, before);
});
