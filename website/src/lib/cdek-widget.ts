export type CdekTariff = { tariff_code: number; tariff_name: string; period_min: number; period_max: number; delivery_sum: number };
export type CdekOffice = { city_code: number; city: string; name: string; address: string; code: string; type: string; postal_code?: string };
export type CdekAddressTarget = { address?: string; formatted?: string; name?: string };
export type CdekWidgetInstance = {
  destroy(): void;
  selectOffice(code: string): void;
  updateLocation(location: string | [number, number], zoom?: number): Promise<void>;
};

declare global {
  interface Window {
    CDEKWidget?: new (config: {
      from: string;
      root: string;
      apiKey: string;
      servicePath: string;
      canChoose: boolean;
      popup: boolean;
      hideDeliveryOptions: { office: boolean; door: boolean };
      goods: Array<{ length: number; width: number; height: number; weight: number }>;
      defaultLocation: string | [number, number];
      officesRaw?: Array<{ code: string; location?: { longitude?: number; latitude?: number } }>;
      lang: "rus";
      currency: "RUB";
      onReady(): void;
      onChoose(type: "office" | "door", tariff: CdekTariff | null, target: CdekOffice | CdekAddressTarget): void;
    }) => CdekWidgetInstance;
  }
}

let cdekWidgetScript: Promise<void> | null = null;

export function loadCdekWidget(): Promise<void> {
  if (window.CDEKWidget) return Promise.resolve();
  if (cdekWidgetScript) return cdekWidgetScript;
  cdekWidgetScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@cdek-it/widget@3.11.1";
    script.async = true;
    script.onload = () => window.CDEKWidget ? resolve() : reject(new Error("Виджет СДЭК не загрузился."));
    script.onerror = () => reject(new Error("Не удалось загрузить карту СДЭК."));
    document.head.append(script);
  }).catch((error: unknown) => { cdekWidgetScript = null; throw error; });
  return cdekWidgetScript;
}
