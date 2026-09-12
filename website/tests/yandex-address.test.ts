import assert from "node:assert/strict";
import test from "node:test";

import { formatYandexSuggestion, parseYandexAddress } from "../src/lib/yandex-address";

test("maps a Yandex house suggestion to checkout address fields", () => {
  const suggestion = {
    title: { text: "дом 3" },
    subtitle: { text: "Москва" },
    address: {
      formatted_address: "Россия, Москва, улица Лесная, 3",
      component: [
        { kind: "country", name: "Россия" },
        { kind: "region", name: "Москва" },
        { kind: "locality", name: "Москва" },
        { kind: "street", name: "улица Лесная" },
        { kind: "house", name: "3" },
      ],
    },
  };

  assert.equal(formatYandexSuggestion(suggestion), "Россия, Москва, улица Лесная, 3");
  assert.deepEqual(parseYandexAddress(suggestion), { region: "Москва", city: "Москва", street: "улица Лесная", house: "3" });
});
