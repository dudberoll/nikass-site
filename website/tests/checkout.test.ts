import assert from "node:assert/strict";
import test from "node:test";
import { paymentResultMessage } from "../src/components/Checkout";

test("payment results preserve fulfillment problems and use normal order wording", () => {
  const payment = { paymentId: "223e4567-e89b-12d3-a456-426614174000", paymentState: "succeeded" as const, orderNumber: null };
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "confirmed", orderNumber: "N-42" }), "Номер заказа: N-42");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "queued" }), "Оплата подтверждена, заказ передан на оформление.");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "uncertain" }), "Оплата подтверждена, но оформление заказа требует проверки менеджером.");
  assert.equal(paymentResultMessage({ ...payment, fulfillmentState: "skipped" }), "Оплата подтверждена, но заказ не оформлен. Свяжитесь с нами для уточнения дальнейших действий.");
});
