import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVariantSelector from '../src/components/ProductVariantSelector';
import CatalogExplorer from '../src/components/CatalogExplorer';
import type { Product } from '../src/data/catalog';

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
