export type YandexSuggestResult = {
  title?: { text?: string };
  subtitle?: { text?: string };
  address?: {
    formatted_address?: string;
    component?: Array<{ kind?: string | string[]; name?: string }>;
  };
};

export type DeliveryAddressFields = Partial<Record<"region" | "city" | "street" | "house", string>>;

export function yandexSuggestType(query: string) {
  const lastToken = query.trim().split(/\s+/).at(-1) ?? "";
  return /\d/.test(lastToken) ? "house" : "street";
}

export function formatYandexSuggestion(result: YandexSuggestResult) {
  return result.address?.formatted_address?.trim()
    || [result.title?.text, result.subtitle?.text].filter(Boolean).join(", ");
}

export function parseYandexAddress(result: YandexSuggestResult): DeliveryAddressFields {
  const components = result.address?.component ?? [];
  const value = (...kinds: string[]) => components.find((component) => {
    const componentKinds = Array.isArray(component.kind) ? component.kind : [component.kind];
    return componentKinds.some((kind) => kinds.includes(kind?.toLowerCase() ?? "")) && component.name?.trim();
  })?.name?.trim();
  const city = value("locality");
  return Object.fromEntries([
    ["region", value("region", "province", "area") ?? city],
    ["city", city],
    ["street", value("street")],
    ["house", value("house")],
  ].filter(([, item]) => item)) as DeliveryAddressFields;
}
