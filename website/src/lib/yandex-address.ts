export type YandexSuggestResult = {
  title?: { text?: string };
  subtitle?: { text?: string };
  address?: {
    formatted_address?: string;
    component?: Array<{ kind?: string; name?: string }>;
  };
};

export type DeliveryAddressFields = Partial<Record<"region" | "city" | "street" | "house", string>>;

export function formatYandexSuggestion(result: YandexSuggestResult) {
  return result.address?.formatted_address?.trim()
    || [result.title?.text, result.subtitle?.text].filter(Boolean).join(", ");
}

export function parseYandexAddress(result: YandexSuggestResult): DeliveryAddressFields {
  const components = result.address?.component ?? [];
  const value = (...kinds: string[]) => components.find((component) => kinds.includes(component.kind ?? "") && component.name?.trim())?.name?.trim();
  return Object.fromEntries([
    ["region", value("region", "province")],
    ["city", value("locality")],
    ["street", value("street")],
    ["house", value("house")],
  ].filter(([, item]) => item)) as DeliveryAddressFields;
}
