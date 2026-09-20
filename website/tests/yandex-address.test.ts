import assert from "node:assert/strict";
import test from "node:test";

import { formatYandexSuggestion, parseYandexAddress, yandexSuggestType } from "../src/lib/yandex-address";

test("switches from street to house suggestions after a house number", () => {
  assert.equal(yandexSuggestType("Москва, Лесная улица"), "street");
  assert.equal(yandexSuggestType("Москва, Лесная улица, 3"), "house");
  assert.equal(yandexSuggestType("Москва, улица 1905 года"), "street");
});

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

test("maps the API response shape with uppercase kind arrays", () => {
  const suggestion = {
    address: {
      component: [
        { kind: ["COUNTRY"], name: "Россия" },
        { kind: ["LOCALITY"], name: "Москва" },
        { kind: ["STREET"], name: "Лесная улица" },
        { kind: ["HOUSE"], name: "3" },
      ],
    },
  };

  assert.deepEqual(parseYandexAddress(suggestion), { region: "Москва", city: "Москва", street: "Лесная улица", house: "3" });
});
