import { expect, test } from '@playwright/test';

const cart = { version: 1, items: [{ slug: 'station', sku: 'NS-31', quantity: 2 }] };
const quote = { checkoutToken: 'a'.repeat(64), expiresAt: '2099-01-01T00:00:00.000Z',
  totals: { currency: 'RUB', items: [{ sku: 'NS-31', name: 'Станция 300 Вт', quantity: 2, totalMinor: 25000 }],
    discountMinor: 0, shippingMinor: 0, totalMinor: 25000 } };
const customer = { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test' };
const paymentId = '223e4567-e89b-12d3-a456-426614174000';

test('removes legacy saved contacts and recovers payment after reload without returning customer data', async ({ page }) => {
  await page.addInitScript(({ cart, quote, customer, paymentId }) => {
    sessionStorage.setItem('nikass-checkout', JSON.stringify({ cart, quote, customer, paymentId }));
  }, { cart, quote, customer, paymentId });
  await page.route('**/api/orders/payment/status', (route) => route.fulfill({ json: {
    paymentId, paymentState: 'succeeded', fulfillmentState: 'confirmed', orderNumber: 'N-42',
  } }));
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Успешная оплата' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nikass-checkout')!));
  expect(saved).toEqual({ cart, quote, paymentId });
  await expect(page.getByText(customer.email, { exact: true })).toHaveCount(0);
  expect(page.url()).not.toContain(quote.checkoutToken);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Успешная оплата' })).toBeVisible();
  await expect(page.getByText('Станция 300 Вт · 2 шт.')).toBeVisible();
});

test('submits contacts only to the API and never saves them at quote or payment redirect', async ({ page }) => {
  await page.route('**/api/orders/payment/status', (route) => route.fulfill({ json: {
    paymentId, paymentState: 'pending', fulfillmentState: 'not_started', orderNumber: null,
  } }));
  await page.route('**/api/orders/quote', async (route) => {
    expect(route.request().postDataJSON().customer).toMatchObject(customer);
    await route.fulfill({ json: quote });
  });
  await page.route('**/api/orders/payment', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ checkoutToken: quote.checkoutToken });
    await route.fulfill({ json: { paymentId, confirmationUrl: 'https://example.test/payment' } });
  });
  await page.route('https://example.test/payment', (route) => route.fulfill({ body: '<html><body>Hosted payment</body></html>', contentType: 'text/html' }));
  await page.goto(`/checkout#cart=${encodeURIComponent(JSON.stringify(cart))}`);
  await page.getByLabel('Имя и фамилия', { exact: true }).fill(customer.name);
  await page.getByLabel('Телефон', { exact: true }).fill(customer.phone);
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByRole('button', { name: 'Перейти к способу доставки' }).click();
  await page.getByRole('button', { name: /Самовывоз/ }).click();
  await page.getByRole('button', { name: 'Перейти к адресу' }).click();
  await page.locator('label:has(input[name="consent"]) .checkout-consent-box').click();
  await expect(page.locator('input[name="consent"]')).toBeChecked();
  await page.locator('.checkout-form button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Проверьте итоговую сумму' })).toBeVisible();
  const savedQuote = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nikass-checkout')!));
  expect(savedQuote).toEqual({ cart, quote });
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page).toHaveURL('https://example.test/payment');
  await page.goto('/checkout');
  const storage = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }));
  const savedPayment = JSON.parse(storage.session['nikass-checkout']!);
  expect(savedPayment).toEqual({ cart, quote, paymentId });
  const serialized = JSON.stringify(storage);
  for (const detail of Object.values(customer)) expect(serialized).not.toContain(detail);
});
