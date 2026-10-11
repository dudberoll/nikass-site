import { expect, test } from '@playwright/test';

const cart = { version: 1, items: [{ slug: 'station', sku: 'NS-31', quantity: 2 }] };
const quote = { checkoutToken: 'a'.repeat(64), expiresAt: '2099-01-01T00:00:00.000Z',
  totals: { currency: 'RUB', items: [{ sku: 'NS-31', name: 'Станция 300 Вт', quantity: 2, totalMinor: 25000 }],
    discountMinor: 0, shippingMinor: 0, totalMinor: 25000 } };
const customer = { name: 'Анна Иванова', phone: '+79991234567', email: 'anna@example.test' };
const paymentId = '223e4567-e89b-12d3-a456-426614174000';
const attemptId = '323e4567-e89b-12d3-a456-426614174000';

async function seedPendingPayment(page: import('@playwright/test').Page) {
  await page.addInitScript(({ cart, quote, paymentId, attemptId }) => {
    sessionStorage.setItem('nikass-checkout-payments', JSON.stringify([{ cart, quote, paymentId, attemptId }]));
    sessionStorage.setItem('nikass-checkout-active-payment', paymentId);
  }, { cart, quote, paymentId, attemptId });
}

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
  await page.locator('label:has(input[name="termsAccepted"]) .checkout-consent-box').click();
  await expect(page.locator('input[name="termsAccepted"]')).toBeChecked();
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

test('continues a previous payment through checkout status confirmation', async ({ page }) => {
  await seedPendingPayment(page);
  let statusCalls = 0;
  let paymentCalls = 0;
  await page.route('**/api/orders/payment/status', async (route) => {
    statusCalls += 1;
    await route.fulfill({ json: { paymentId, paymentState: 'pending', fulfillmentState: 'not_started', orderNumber: null } });
  });
  await page.route('**/api/orders/payment', async (route) => {
    paymentCalls += 1;
    expect(route.request().postDataJSON()).toEqual({ checkoutToken: quote.checkoutToken });
    await route.fulfill({ json: { paymentId, confirmationUrl: 'https://example.test/payment', attemptId } });
  });

  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'У вас есть неоплаченный заказ' })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить предыдущую оплату' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Ожидает оплаты' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Обновить статус' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Оплатить' })).toBeVisible();
  expect(statusCalls).toBe(2);
  expect(paymentCalls).toBe(1);
});

test('does not offer payment after checkout refresh finds the previous payment canceled', async ({ page }) => {
  await seedPendingPayment(page);
  let statusCalls = 0;
  let paymentCalls = 0;
  await page.route('**/api/orders/payment/status', async (route) => {
    statusCalls += 1;
    await route.fulfill({ json: {
      paymentId, paymentState: statusCalls === 1 ? 'pending' : 'canceled',
      fulfillmentState: 'not_started', orderNumber: null,
    } });
  });
  await page.route('**/api/orders/payment', async (route) => {
    paymentCalls += 1;
    await route.fulfill({ json: { paymentId, confirmationUrl: 'https://example.test/payment', attemptId } });
  });

  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'У вас есть неоплаченный заказ' })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить предыдущую оплату' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Оплата отменена' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Оплатить' })).toHaveCount(0);
  expect(statusCalls).toBe(2);
  expect(paymentCalls).toBe(0);
});

test('refreshes checkout payment status after browser back restores the page from BFCache', async ({ page }) => {
  await page.addInitScript(({ cart, quote }) => {
    if (!sessionStorage.getItem('nikass-checkout')) sessionStorage.setItem('nikass-checkout', JSON.stringify({ cart, quote }));
    window.addEventListener('DOMContentLoaded', () => {
      sessionStorage.setItem('e2e-document-loads', String(Number(sessionStorage.getItem('e2e-document-loads') ?? 0) + 1));
    });
  }, { cart, quote });
  let statusCalls = 0;
  await page.route('**/api/orders/payment/status', async (route) => {
    statusCalls += 1;
    await route.fulfill({ json: { paymentId, paymentState: 'pending', fulfillmentState: 'not_started', orderNumber: null } });
  });
  await page.route('**/api/orders/payment', async (route) => {
    await route.fulfill({ json: { paymentId, confirmationUrl: new URL('/mock-yookassa', page.url()).href, attemptId } });
  });
  await page.route('**/mock-yookassa', (route) => route.fulfill({ body: '<html><body>Hosted payment</body></html>', contentType: 'text/html' }));

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page).toHaveURL(/mock-yookassa/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Ожидает оплаты' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Обновить статус' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Оплатить' })).toBeVisible();
  expect(statusCalls).toBe(1);

  const loadedDocuments = await page.evaluate(() => Number(sessionStorage.getItem('e2e-document-loads')));
  await page.evaluate((paymentId) => sessionStorage.setItem('nikass-checkout-payment-return', paymentId), paymentId);
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(() => window.setTimeout(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })), 0)),
  ]);
  await expect.poll(() => page.evaluate(() => Number(sessionStorage.getItem('e2e-document-loads')))).toBe(loadedDocuments + 1);
  await expect(page.getByRole('heading', { name: 'Ожидает оплаты' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Обновить статус' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Оплатить' })).toBeVisible();
  expect(statusCalls).toBe(2);

  await page.getByRole('button', { name: 'Оплатить' }).click();
  await expect(page).toHaveURL(/mock-yookassa/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Ожидает оплаты' })).toBeVisible();
  await expect.poll(() => statusCalls).toBe(3);
  await expect(page.getByRole('button', { name: 'Оплатить' })).toBeVisible();
});
