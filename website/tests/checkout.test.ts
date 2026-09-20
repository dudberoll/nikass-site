import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checkout = readFileSync(fileURLToPath(new URL("../src/components/Checkout.tsx", import.meta.url)), "utf8");

test("checkout preserves the display snapshot across the payment redirect", () => {
  assert.match(checkout, /customerSnapshotSchema/);
  assert.match(checkout, /customer: snapshot/);
  assert.match(checkout, /h2>Ожидает оплаты<\/h2>/);
  assert.match(checkout, /h2>Успешная оплата<\/h2>/);
  assert.match(checkout, /Менеджер свяжется с вами в течение часа, чтобы подтвердить все данные и заказ/);
  assert.match(checkout, /<dt>Имя<\/dt>/);
  assert.match(checkout, /<dt>Фамилия<\/dt>/);
  assert.match(checkout, /<dt>Телефон<\/dt>/);
  assert.match(checkout, /<dt>E-mail<\/dt>/);
});

test("delivery form keeps apartment, postcode and comment optional", () => {
  assert.match(checkout, /Квартира \/ офис \(необязательно\)/);
  assert.match(checkout, /required=\{name === "house"\}/);
  assert.match(checkout, /<textarea id="comment" name="comment" maxLength=\{1000\} defaultValue=/);
  assert.doesNotMatch(checkout, /<textarea[^>]*\brequired\b/);
});
