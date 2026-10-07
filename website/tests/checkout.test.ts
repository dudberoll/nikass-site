import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { paymentResultMessage } from "../src/components/Checkout";

const checkout = readFileSync(fileURLToPath(new URL("../src/components/Checkout.tsx", import.meta.url)), "utf8");
const checkoutPage = readFileSync(fileURLToPath(new URL("../src/pages/checkout.astro", import.meta.url)), "utf8");

test("checkout displays contacts from memory while preserving payment and order summaries", () => {
  assert.match(checkout, /customerSnapshotSchema/);
  assert.match(checkout, /setCustomer\(snapshot\)/);
  assert.match(checkout, /h2>Ожидает оплаты<\/h2>/);
  assert.match(checkout, /h2>Успешная оплата<\/h2>/);
  assert.match(checkout, /Менеджер свяжется с вами в течение часа в рабочее время, чтобы подтвердить все данные и заказ/);
  assert.match(checkoutPage, /Менеджер свяжется с вами в течение 1 часа в рабочее время и уточнит способ получения заказа/);
  assert.match(checkout, /<dt>Имя<\/dt>/);
  assert.match(checkout, /<dt>Фамилия<\/dt>/);
  assert.match(checkout, /<dt>Телефон<\/dt>/);
  assert.match(checkout, /<dt>E-mail<\/dt>/);
  assert.doesNotMatch(checkout, /тестов|деньги не списывались/iu);
});

test("payment results preserve fulfillment problems and use normal order wording", () => {
  const payment = { paymentId: "223e4567-e89b-12d3-a456-426614174000", paymentState: "succeeded" as const, orderNumber: null };
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "confirmed", orderNumber: "N-42" }), "Номер заказа: N-42");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "queued" }), "Оплата подтверждена, заказ передан на оформление.");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "uncertain" }), "Оплата подтверждена, но оформление заказа требует проверки менеджером.");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "skipped" }), "Оплата подтверждена, но заказ не оформлен. Свяжитесь с нами для уточнения дальнейших действий.");
});

test("delivery form keeps apartment, postcode and comment optional", () => {
  assert.match(checkout, /Квартира \/ офис \(необязательно\)/);
  assert.match(checkout, /required=\{name === "house"\}/);
  assert.match(checkout, /<textarea id="comment" name="comment" maxLength=\{1000\} defaultValue=/);
  assert.doesNotMatch(checkout, /<textarea[^>]*\brequired\b/);
});
