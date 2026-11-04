import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductVariantSelector from '../src/components/ProductVariantSelector';
import { loadCatalogProducts } from '../src/data/catalog';
import { addCartItem } from '../src/lib/cart';

test('every in-stock SKU uses the existing manager notice and contact dialog instead of the cart', async () => {
  const products = await loadCatalogProducts('all');
  let checked = 0;
  for (const product of products) {
    for (const variant of product.variants.filter((item) => item.availability === 'in-stock')) {
      const selected = { ...product, variants: [variant] };
      const markup = renderToStaticMarkup(<ProductVariantSelector product={selected} />);
      assert.match(markup, /class="manager-order-notice"/);
      assert.match(markup, /Заказ через менеджера/);
      assert.match(markup, /Заказать у менеджера/);
      assert.match(markup, /Связаться с менеджером/);
      assert.doesNotMatch(markup, /Добавить в корзину|Увеличить количество/);
      assert.deepEqual(addCartItem([], selected, variant.sku), []);
      checked++;
    }
  }
  assert.ok(checked > 0);
});
