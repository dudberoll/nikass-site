import { useEffect, useRef, useState } from "react";

import { cdekParcelsResponseSchema, cartReviewRequestSchema } from "@web-app-demo/contracts";
import { loadCdekWidget, type CdekWidgetInstance, type CdekTariff } from "../lib/cdek-widget";
import { readCart, subscribeToCart, type CartLine } from "../lib/cart";
import { formatYandexSuggestion, parseYandexAddress, yandexSuggestType, type YandexSuggestResult } from "../lib/yandex-address";

type Address = { city: string; street?: string; house?: string };
type DeliveryMode = "office" | "courier";
type CdekCity = { code?: number | string; city?: string; full_name?: string };
type CdekPoint = {
  code: string;
  name?: string;
  work_time?: string;
  address?: string;
  city?: string;
  location?: { city?: string; address?: string; address_full?: string; longitude?: number; latitude?: number };
};
type ShippingEstimate = { tariff: CdekTariff; amountMinor: number };
type Props = { apiBase: string; cdekYandexApiKey: string; yandexGeocoderApiKey: string; yandexSuggestApiKey: string };

function records<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "items" in value && Array.isArray(value.items)) return value.items as T[];
  return value && typeof value === "object" ? [value as T] : [];
}

function normalizeCityName(value: string | undefined) {
  return value?.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[‐‑‒–—]/g, "-").trim() ?? "";
}

function officeAddress(point: CdekPoint) {
  return point.location?.address_full || point.location?.address || point.address || "Адрес не указан";
}

function distanceToOffice(point: CdekPoint, origin: [number, number] | null): number | null {
  const { longitude, latitude } = point.location ?? {};
  if (!origin || typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
  const radians = Math.PI / 180;
  const a = Math.sin((latitude - origin[1]) * radians / 2) ** 2
    + Math.cos(origin[1] * radians) * Math.cos(latitude * radians) * Math.sin((longitude - origin[0]) * radians / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0 }).format(minor / 100);

export default function CdekSandbox({ apiBase, cdekYandexApiKey, yandexGeocoderApiKey, yandexSuggestApiKey }: Props) {
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [resultsAddress, setResultsAddress] = useState("");
  const [suggestions, setSuggestions] = useState<YandexSuggestResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [apiEnabled, setApiEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState<CdekPoint[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("office");
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedCourierAddress, setSelectedCourierAddress] = useState("");
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [mapLocation, setMapLocation] = useState("");
  const [mapCoordinates, setMapCoordinates] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [cartReadFailed, setCartReadFailed] = useState(false);
  const [parcels, setParcels] = useState<ReturnType<typeof cdekParcelsResponseSchema.parse> | null>(null);
  const [parcelsLoading, setParcelsLoading] = useState(false);
  const [parcelsError, setParcelsError] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const widget = useRef<CdekWidgetInstance | null>(null);
  const mapSection = useRef<HTMLElement | null>(null);
  const addressSection = useRef<HTMLElement | null>(null);
  const initialSearchStarted = useRef(false);
  const servicePath = `${apiBase}/api/orders/cdek-widget`;
  const rankedOffices = offices.map((point) => ({ ...point, distance: distanceToOffice(point, mapCoordinates) }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  useEffect(() => {
    const updateCart = (state: ReturnType<typeof readCart>) => {
      setCartLines(state.items);
      setCartReadFailed(Boolean(state.error));
    };
    updateCart(readCart());
    return subscribeToCart(updateCart);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`${servicePath}/config`).then(async (response) => {
      const config = await response.json() as { enabled?: unknown };
      if (!response.ok || typeof config.enabled !== "boolean") throw new Error();
      if (active) setApiEnabled(config.enabled);
    }).catch(() => { if (active) setApiEnabled(false); });
    return () => { active = false; };
  }, [servicePath]);

  useEffect(() => {
    setShippingEstimate(null);
    if (!apiEnabled || cartReadFailed || cartLines.length === 0) {
      setParcels(null);
      setParcelsLoading(false);
      setParcelsError("");
      return;
    }

    const cart = cartReviewRequestSchema.safeParse({ version: 1, items: cartLines.map(({ productSlug, variantSku, quantity }) => ({ slug: productSlug, sku: variantSku, quantity })) });
    if (!cart.success) {
      setParcels(null);
      setParcelsLoading(false);
      setParcelsError("Не удалось прочитать корзину для расчёта доставки.");
      return;
    }

    let active = true;
    setParcels(null);
    setParcelsLoading(true);
    setParcelsError("");
    void fetch(`${apiBase}/api/orders/cdek-parcels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: cart.data }),
    }).then(async (response) => {
      const value: unknown = await response.json();
      if (!response.ok) throw new Error();
      return cdekParcelsResponseSchema.parse(value);
    }).then((value) => {
      if (active) setParcels(value);
    }).catch(() => {
      if (active) setParcelsError("Не удалось получить вес и габариты товаров из WooCommerce.");
    }).finally(() => {
      if (active) setParcelsLoading(false);
    });
    return () => { active = false; };
  }, [apiBase, apiEnabled, cartLines, cartReadFailed]);

  useEffect(() => {
    if (!apiEnabled || initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    void findOffices({ city: "Москва" }, "Москва", true);
  }, [apiEnabled, findOffices]);

  useEffect(() => {
    if (resultsAddress) addressSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultsAddress]);

  useEffect(() => {
    const query = addressQuery.trim();
    if (!yandexSuggestApiKey || query.length < 3 || query === selectedAddressText) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const url = new URL("https://suggest-maps.yandex.ru/v1/suggest");
        url.search = new URLSearchParams({
          apikey: yandexSuggestApiKey,
          text: query,
          lang: "ru",
          results: "7",
          types: yandexSuggestType(query),
          countries: "ru",
          print_address: "1",
        }).toString();
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { results?: YandexSuggestResult[] };
        if (controller.signal.aborted) return;
        setSuggestions(Array.isArray(data.results) ? data.results : []);
        setSuggestionError("");
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionError("Подсказки адреса временно недоступны.");
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [addressQuery, selectedAddressText, yandexSuggestApiKey]);

  useEffect(() => {
    if (!apiEnabled || !cdekYandexApiKey || !mapLocation) return;
    let active = true;
    let positioned = false;
    setMapReady(false);
    setMapError("");
    const firstPoint = offices.find((point) => typeof point.location?.longitude === "number" && typeof point.location?.latitude === "number");
    const center = mapCoordinates ?? (firstPoint ? [firstPoint.location!.longitude!, firstPoint.location!.latitude!] as [number, number] : mapLocation);
    void loadCdekWidget().then(() => {
      if (!active || !window.CDEKWidget) return;
      widget.current = new window.CDEKWidget({
        from: "Москва", root: "cdek-sandbox-map-widget", apiKey: cdekYandexApiKey,
        servicePath, canChoose: true, popup: false,
        hideDeliveryOptions: { office: deliveryMode !== "office", door: deliveryMode !== "courier" }, goods: parcels?.canCalculate ? parcels.parcels : [], officesRaw: offices,
        defaultLocation: center, lang: "rus", currency: "RUB",
        onReady: () => {
          if (!active) return;
          setMapReady(true);
          if (mapCoordinates && !positioned) {
            positioned = true;
            void widget.current?.updateLocation(mapCoordinates, 13);
          }
        },
        onChoose: (type, _tariff, target) => {
          if (type === "office" && "city_code" in target) {
            setDeliveryMode("office");
            setSelectedCode(target.code);
            setSelectedCourierAddress("");
          } else if (type === "door" && !("city_code" in target)) {
            setDeliveryMode("courier");
            setSelectedCode("");
            setSelectedCourierAddress(target.address || target.formatted || target.name || "Адрес доставки");
          } else return;
          setShippingEstimate(_tariff && Number.isFinite(_tariff.delivery_sum) && _tariff.delivery_sum >= 0
            ? { tariff: _tariff, amountMinor: Math.round(_tariff.delivery_sum * 100) }
            : null);
        },
      });
    }).catch((cause: unknown) => {
      if (active) setMapError(cause instanceof Error ? cause.message : "Карта СДЭК не загрузилась.");
    });
    return () => { active = false; widget.current?.destroy(); widget.current = null; };
  }, [apiEnabled, cdekYandexApiKey, deliveryMode, mapCoordinates, mapLocation, offices, parcels, servicePath, yandexGeocoderApiKey]);

  useEffect(() => {
    if (mapReady && selectedCode) widget.current?.selectOffice(selectedCode);
  }, [mapReady, selectedCode]);

  function updateAddressQuery(value: string) {
    setAddressQuery(value);
    setAddress(null);
    setSelectedAddressText("");
    setResultsAddress("");
    setSelectedCode("");
    setShippingEstimate(null);
    setError("");
    setApiMessage("");
  }

  function chooseDeliveryMode(mode: DeliveryMode) {
    if (mode === deliveryMode) return;
    setDeliveryMode(mode);
    setSelectedCode("");
    setSelectedCourierAddress("");
    setShippingEstimate(null);
  }

  function selectAddress(suggestion: YandexSuggestResult) {
    const parsed = parseYandexAddress(suggestion);
    if (!parsed.city?.trim()) {
      setError("В подсказке не найден город. Уточните адрес и выберите вариант с городом.");
      return;
    }
    const nextAddress: Address = { city: parsed.city, ...(parsed.street ? { street: parsed.street } : {}), ...(parsed.house ? { house: parsed.house } : {}) };
    const displayAddress = formatYandexSuggestion(suggestion);
    setAddress(nextAddress);
    setAddressQuery(displayAddress);
    setSelectedAddressText(displayAddress);
    setSuggestions([]);
    setSuggestionError("");
    setResultsAddress("");
    setSelectedCode("");
    setShippingEstimate(null);
    setError("");
    setApiMessage("");
    void findOffices(nextAddress, displayAddress);
  }

  function submitAddress(event: { preventDefault(): void }) {
    event.preventDefault();
    if (address && addressQuery.trim() === selectedAddressText) return;
    if (suggestions.length === 1) { selectAddress(suggestions[0]); return; }
    setError("Выберите подходящий адрес из подсказок.");
  }

  async function findOffices(searchAddress: Address, displayAddress: string, initial = false) {
    if (!searchAddress.city.trim()) { setError("Выберите адрес с указанным городом."); return; }
    if (!apiEnabled) { setError("Проверьте настройки тестового API СДЭК в backend/.env."); return; }
    setLoading(true);
    setError("");
    setSelectedCode("");
    setResultsAddress("");
    try {
      const cityUrl = new URL(servicePath);
      cityUrl.search = new URLSearchParams({ action: "cities", name: searchAddress.city.trim(), country_code: "RU" }).toString();
      const cityResponse = await fetch(cityUrl);
      if (!cityResponse.ok) throw new Error(`СДЭК не нашёл город (HTTP ${cityResponse.status}).`);
      const cityCandidates = records<CdekCity>(await cityResponse.json());
      const requestedCity = normalizeCityName(searchAddress.city);
      const city = cityCandidates.find((item) => normalizeCityName(item.city) === requestedCity
        || normalizeCityName(item.full_name) === requestedCity
        || normalizeCityName(item.full_name).startsWith(`${requestedCity},`));
      const cityCode = Number(city?.code);
      if (!city || !Number.isInteger(cityCode) || cityCode <= 0) throw new Error(`СДЭК не подтвердил город «${searchAddress.city.trim()}». Уточните его название.`);

      const officesUrl = new URL(servicePath);
      const params = new URLSearchParams({ action: "offices", city_code: String(cityCode), type: "PVZ", lang: "rus" });
      officesUrl.search = params.toString();
      const officeResponse = await fetch(officesUrl);
      if (!officeResponse.ok) throw new Error(`СДЭК не вернул пункты выдачи (HTTP ${officeResponse.status}).`);
      const points = records<CdekPoint>(await officeResponse.json());
      let geocodeNote = "";
      let coordinates: [number, number] | null = null;
      let resolvedLocation = displayAddress || [city.full_name || city.city || searchAddress.city, searchAddress.street, searchAddress.house].filter(Boolean).join(", ");
      if (yandexGeocoderApiKey) {
        try {
          const geocoderUrl = new URL("https://geocode-maps.yandex.ru/v1/");
          geocoderUrl.search = new URLSearchParams({ apikey: yandexGeocoderApiKey, geocode: resolvedLocation, format: "json", results: "1" }).toString();
          const geocoderResponse = await fetch(geocoderUrl);
          if (!geocoderResponse.ok) throw new Error(`HTTP ${geocoderResponse.status}`);
          const geocoderData = await geocoderResponse.json() as { response?: { GeoObjectCollection?: { featureMember?: Array<{ GeoObject?: { Point?: { pos?: string }; metaDataProperty?: { GeocoderMetaData?: { text?: string; kind?: string; precision?: string } } } }> } } };
          const geoObject = geocoderData.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
          const metadata = geoObject?.metaDataProperty?.GeocoderMetaData;
          if (searchAddress.street && metadata?.kind !== "street" && metadata?.kind !== "house") throw new Error("Улица не найдена. Проверьте город и название улицы");
          const position = geoObject?.Point?.pos;
          const [longitude, latitude] = position?.split(" ").map(Number) ?? [];
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) throw new Error();
          coordinates = [longitude, latitude];
          resolvedLocation = metadata?.text || resolvedLocation;
          geocodeNote = " Расстояния по прямой.";
          if (searchAddress.street && !searchAddress.house && metadata?.precision !== "exact") geocodeNote += " Указана улица без дома, поэтому расстояния ориентировочные.";
          if (searchAddress.house && metadata?.precision !== "exact") geocodeNote += " Дом определён приблизительно.";
        } catch (cause) {
          const reason = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
          geocodeNote = ` Не удалось определить адрес${reason}. Показаны пункты города без сортировки по расстоянию.`;
        }
      }
      setOffices(points);
      setMapCoordinates(coordinates);
      setResultsAddress(initial ? "" : displayAddress);
      setApiMessage(initial
        ? `На карте ${city?.city || city?.full_name || searchAddress.city} — ${points.length} ПВЗ. Введите улицу или адрес, чтобы найти ближайшие.`
        : `Найдено ПВЗ: ${points.length}.${geocodeNote}`);
      setMapLocation(resolvedLocation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось получить пункты выдачи СДЭК.");
    } finally {
      setLoading(false);
    }
  }

  const visibleOffices = rankedOffices.slice(0, 5);

  return <div className="cdek-sandbox">
    <h1 className="sr-only">Доставка</h1>
    <section className="cdek-sandbox-delivery" aria-label="Способ получения и стоимость доставки">
      <div className="cdek-sandbox-delivery-options" role="group" aria-label="Способ получения">
        <button className={`cdek-sandbox-delivery-option${deliveryMode === "office" ? " is-selected" : ""}`} type="button" aria-pressed={deliveryMode === "office"} onClick={() => chooseDeliveryMode("office")}>
          <span className="cdek-sandbox-delivery-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
          <span className="cdek-sandbox-delivery-copy"><strong>ПВЗ</strong><small>Получить в пункте выдачи</small></span>
          {deliveryMode === "office" && <span className="cdek-sandbox-selected-mark" aria-hidden="true">✓</span>}
        </button>
        <button className={`cdek-sandbox-delivery-option${deliveryMode === "courier" ? " is-selected" : ""}`} type="button" aria-pressed={deliveryMode === "courier"} onClick={() => chooseDeliveryMode("courier")}>
          <span className="cdek-sandbox-delivery-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg></span>
          <span className="cdek-sandbox-delivery-copy"><strong>Курьер</strong><small>Доставка по адресу</small></span>
          {deliveryMode === "courier" && <span className="cdek-sandbox-selected-mark" aria-hidden="true">✓</span>}
        </button>
      </div>
      <div className="cdek-sandbox-delivery-total" aria-live="polite">
        <span className="cdek-sandbox-delivery-label">Итог доставки</span>
        <strong>{shippingEstimate ? money(shippingEstimate.amountMinor) : "—"}</strong>
        <span>{shippingEstimate
          ? `${deliveryMode === "office" ? `ПВЗ ${selectedCode}` : selectedCourierAddress} · ${shippingEstimate.tariff.period_min}–${shippingEstimate.tariff.period_max} дн.`
          : deliveryMode === "office" ? "Выберите пункт выдачи" : "Укажите адрес доставки"}</span>
      </div>
    </section>
    {cartReadFailed ? <p className="checkout-error" role="alert">Не удалось прочитать корзину в этом браузере.</p>
      : cartLines.length === 0 ? <p className="checkout-hint cdek-sandbox-delivery-note">Добавьте товар в <a href="/cart">корзину</a>, чтобы рассчитать доставку по его весу и габаритам.</p>
        : parcelsLoading ? <p className="checkout-hint cdek-sandbox-delivery-note" role="status">Получаем вес и габариты товаров…</p>
          : parcelsError ? <p className="checkout-error" role="alert">{parcelsError}</p>
            : parcels?.canCalculate ? <p className="checkout-hint cdek-sandbox-delivery-note">Для расчёта используются {parcels.parcels.length} мест из текущей корзины. Выберите вариант на карте — тариф появится здесь.</p>
              : parcels ? <p className="checkout-hint cdek-sandbox-delivery-note" role="status">Не хватает веса или габаритов у {parcels.missingItems} позиций, поэтому тариф не рассчитан.</p>
                : <p className="checkout-hint cdek-sandbox-delivery-note">Для расчёта добавьте товар в корзину.</p>}
    {error && <p className="checkout-error" role="alert">{error}</p>}

    <div className="cdek-sandbox-layout">
      <section ref={mapSection} className="cdek-sandbox-panel" aria-labelledby="cdek-map-title">
        <div className="cdek-sandbox-map-heading">
          <h2 id="cdek-map-title">{deliveryMode === "office" ? "Пункты на карте" : "Адрес доставки"}</h2>
          {mapLocation && <span>{mapLocation}</span>}
        </div>
        <div className="cdek-sandbox-map-frame">
          <div className="cdek-sandbox-map" id="cdek-sandbox-map-widget" aria-label="Интерактивная карта СДЭК для выбора доставки" />
          {!mapReady && <div className="cdek-sandbox-map-placeholder">
            <span className="cdek-sandbox-map-pin" aria-hidden="true">⌖</span>
            <strong>{mapError || (cdekYandexApiKey ? "Загружаем карту СДЭК…" : "Область карты СДЭК")}</strong>
            <span>{cdekYandexApiKey ? "Карта появится после загрузки списка пунктов." : "Для выбора доставки на карте настройте ключ Яндекс JavaScript API."}</span>
          </div>}
        </div>
        {selectedCode && <p className="checkout-hint">Выбран пункт {selectedCode}.</p>}
      </section>

      {deliveryMode === "office" && <section ref={addressSection} className="cdek-sandbox-panel" aria-labelledby="cdek-address-title">
        <h2 id="cdek-address-title">Адрес или улица</h2>
        <form className="cdek-sandbox-form" onSubmit={submitAddress}>
          <div className="checkout-address-suggest">
            <label className="cdek-sandbox-field cdek-sandbox-address-field" htmlFor="cdek-address-search">
              <span>Начните вводить адрес</span>
              <input id="cdek-address-search" type="text" autoComplete="street-address" disabled={loading || apiEnabled === null} value={addressQuery} placeholder="Например, Азовская, Москва" aria-describedby="cdek-address-help" onChange={(event) => updateAddressQuery(event.currentTarget.value)} onBlur={() => window.setTimeout(() => setSuggestions([]), 120)} onKeyDown={(event) => { if (event.key === "Escape") setSuggestions([]); }} />
            </label>
            {suggestions.length > 0 && <ul className="checkout-address-suggest-list" id="cdek-address-suggestions">{suggestions.map((suggestion, index) => <li key={`${formatYandexSuggestion(suggestion)}-${index}`}><button className="checkout-address-suggest-option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAddress(suggestion)}><strong>{suggestion.title?.text || formatYandexSuggestion(suggestion)}</strong>{suggestion.subtitle?.text && <span>{suggestion.subtitle.text}</span>}</button></li>)}</ul>}
          </div>
          <p className="checkout-hint" id="cdek-address-help">Выберите вариант из списка — ближайшие ПВЗ появятся автоматически.</p>
          {suggestionsLoading && <p className="checkout-hint" role="status">Ищем адрес…</p>}
          {suggestionError && <p className="checkout-error" role="alert">{suggestionError}</p>}
          {!yandexSuggestApiKey && <p className="checkout-error" role="alert">Не настроен ключ Яндекс Геосаджеста для подсказок адреса.</p>}
          {loading && <p className="checkout-hint" role="status">Ищем ближайшие пункты выдачи…</p>}
          {apiMessage && <p className="checkout-hint" role="status">{apiMessage}</p>}
        </form>

        <div className="cdek-sandbox-results" aria-live="polite">
          {resultsAddress && offices.length > 0 && <>
            <h3>{mapCoordinates ? "Ближайшие пункты выдачи" : "Пункты выдачи"}</h3>
            <p className="checkout-hint">{mapCoordinates ? `Показаны ${visibleOffices.length} ближайших из ${offices.length}; расстояние по прямой. ` : "Не удалось определить расстояние; показаны пункты города. "}Пункты из тестового API СДЭК могут отличаться от действующих.</p>
            <ul>{visibleOffices.map((point) => <li key={point.code}>
              <button className={`cdek-sandbox-point${selectedCode === point.code ? " is-selected" : ""}`} type="button" aria-pressed={selectedCode === point.code} onClick={() => {
                setSelectedCode(point.code);
                mapSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                <strong>{point.name || point.code}</strong>
                <span>{point.city || point.location?.city || address?.city || "Москва"}, {officeAddress(point)}</span>
                <small>{point.code}{point.work_time ? ` · ${point.work_time}` : ""}</small>
                {point.distance !== null && <small>{point.distance < 1000 ? `${Math.round(point.distance)} м` : `${(point.distance / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} км`} от указанного адреса</small>}
              </button>
            </li>)}</ul>
          </>}
          {resultsAddress && offices.length === 0 && <p>Для выбранного адреса пункты выдачи не найдены.</p>}
          {selectedCode && <p className="checkout-hint">Пункт выдачи выбран: {selectedCode}.</p>}
        </div>
      </section>}
    </div>
  </div>;
}
