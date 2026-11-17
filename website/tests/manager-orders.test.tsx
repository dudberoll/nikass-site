import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVariantSelector from '../src/components/ProductVariantSelector';
import { selectCatalogProducts } from '../src/data/catalog';
import { catalogSnapshot } from '../src/data/catalog-snapshot';
import { addCartItem } from '../src/lib/cart';

test('manager panels stay outside the cart while available ordinary models can be added', () => {
  const products = selectCatalogProducts(catalogSnapshot);
  for (const sku of ['SP-30', 'SP-50', 'SP-100', 'FSP-30', 'PB-20']) {
    const product = products.find(p => p.variants.some(v => v.sku === sku))!;
    const variant = product.variants.find(v => v.sku === sku)!;
    const selected = { ...product, variants: [variant] };
    const markup = renderToStaticMarkup(<ProductVariantSelector product={selected} />);
    const manager = ['SP-30', 'SP-50', 'SP-100'].includes(sku);
    assert.equal(markup.includes('Заказать у менеджера'), manager, sku);
    assert.equal(markup.includes('Добавить в корзину'), !manager, sku);
    assert.equal(addCartItem([], selected, sku).length, manager ? 0 : 1, sku);
  }
  const panel = products.find(p => p.variants.some(v => v.sku === 'SP-450'))!;
  assert.deepEqual(addCartItem([], panel, 'SP-450'), []);
});
