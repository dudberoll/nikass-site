import assert from "node:assert/strict";
import test from "node:test";

import { selectCdekDeliveryOptions } from "../src/lib/cdek-tariffs";
import type { CdekTariff } from "../src/lib/cdek-widget";

const tariff = (tariff_code: number, tariff_name: string, delivery_mode: number, delivery_sum: number, period_min = 2): CdekTariff => ({
  tariff_code, tariff_name, delivery_mode, delivery_sum, period_min, period_max: period_min + 1,
});

const rates = [
  tariff(136, "Посылка склад-склад", 4, 490),
  tariff(138, "Посылка дверь-склад", 2, 730),
  tariff(137, "Посылка склад-дверь", 3, 650),
  tariff(139, "Посылка дверь-дверь", 1, 890),
  tariff(483, "Экспресс склад-склад", 4, 1045),
  tariff(481, "Экспресс дверь-склад", 2, 1135),
  tariff(482, "Экспресс склад-дверь", 3, 1200),
  tariff(480, "Экспресс дверь-дверь", 1, 1400),
  tariff(61, "Магистральный экспресс склад-склад", 4, 300),
  tariff(62, "Магистральный экспресс склад-дверь", 3, 400),
  tariff(363, "Сборный груз склад-склад", 4, 200),
];

test("offers only standard and express delivery to a pickup point, keeping API prices and periods", () => {
  const before = [...rates];
  assert.deepEqual(selectCdekDeliveryOptions(rates, "office"), [
    { label: "Обычная доставка", tariff: rates[0] },
    { label: "Экспресс-доставка", tariff: rates[4] },
  ]);
  assert.deepEqual(rates, before);
});

test("selects courier rates for the same two delivery options", () => {
  assert.deepEqual(selectCdekDeliveryOptions(rates, "courier"), [
    { label: "Обычная доставка", tariff: rates[2] },
    { label: "Экспресс-доставка", tariff: rates[6] },
  ]);
});

test("leaves unavailable options empty instead of substituting cargo or the wrong delivery mode", () => {
  assert.deepEqual(selectCdekDeliveryOptions([rates[0]!, rates[6]!, rates[8]!, rates[10]!], "office"), [
    { label: "Обычная доставка", tariff: rates[0] },
    { label: "Экспресс-доставка", tariff: null },
  ]);
  assert.deepEqual(selectCdekDeliveryOptions([], "courier").map((option) => option.tariff), [null, null]);
});

test("uses the shorter API period to break a price tie and keeps standard first even if express is cheaper", () => {
  const slow = tariff(136, "Посылка склад-склад", 4, 500, 5);
  const fast = tariff(138, "Посылка дверь-склад", 2, 500, 2);
  const express = tariff(483, "Экспресс склад-склад", 4, 400);
  assert.deepEqual(selectCdekDeliveryOptions([slow, express, fast], "office").map((option) => option.tariff), [fast, express]);
});
