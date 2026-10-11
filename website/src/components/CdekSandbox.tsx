import { useEffect, useRef, useState } from "react";

import { cdekParcelsResponseSchema, cartReviewRequestSchema, type CdekOrderDelivery, type CartReviewRequest } from "@web-app-demo/contracts";
import { loadCdekWidget, type CdekWidgetInstance, type CdekTariff } from "../lib/cdek-widget";
import { selectCdekDeliveryOptions, type CdekDeliveryOption } from "../lib/cdek-tariffs";
import { readCart, subscribeToCart } from "../lib/cart";
import { formatYandexSuggestion, parseYandexAddress, yandexSuggestType, type YandexSuggestResult } from "../lib/yandex-address";

type Address = { region?: string; city?: string; street?: string; house?: string; apartment?: string; postcode?: string };
type DeliveryMode = "office" | "courier";
type CdekCity = { code?: number | string; city?: string; full_name?: string };
type CdekPoint = {
  code: string;
  name?: string;
  work_time?: string;
  address?: string;
  city?: string;
  type?: string;
  postal_code?: string;
  location?: { city_code?: number; city?: string; address?: string; address_full?: string; longitude?: number; latitude?: number };
};
type Props = { apiBase: string; cdekYandexApiKey: string; yandexGeocoderApiKey: string; yandexSuggestApiKey: string; checkoutCart?: CartReviewRequest; onContinue?: (delivery: CdekOrderDelivery) => void };
const courierAddressFields = [["house", "Дом / корпус", "text", "address-line2", 30], ["apartment", "Квартира / офис (необязательно)", "text", "address-line3", 30], ["postcode", "Почтовый индекс", "text", "postal-code", 6]] as const;
const manualCourierAddressFields = [["region", "Регион / область", "text", "address-level1", 100], ["city", "Город", "text", "address-level2", 100], ["street", "Улица", "text", "address-line1", 150]] as const;
const MOSCOW_MAP_CENTER: [number, number] = [37.6173, 55.7558];

function records<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "items" in value && Array.isArray(value.items)) return value.items as T[];
  return value && typeof value === "object" ? [value as T] : [];
}

function normalizeCityName(value: string | undefined) {
  return value?.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[‐‑‒–—]/g, "-").trim() ?? "";
}

function officeAddress(point: CdekPoint) {
  return point.location?.address || point.address || point.location?.address_full || "Адрес не указан";
}

function distanceToOffice(point: CdekPoint, origin: [number, number] | null): number | null {
  const { longitude, latitude } = point.location ?? {};
  if (!origin || typeof longitude !== "number" || typeof latitude !== "number" || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null;
  const radians = Math.PI / 180;
  const a = Math.sin((latitude - origin[1]) * radians / 2) ** 2
    + Math.cos(origin[1] * radians) * Math.cos(latitude * radians) * Math.sin((longitude - origin[0]) * radians / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function parseTariffs(value: unknown): CdekTariff[] {
  if (!value || typeof value !== "object" || !("tariff_codes" in value) || !Array.isArray(value.tariff_codes)) return [];
  return value.tariff_codes.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return Number.isInteger(row.tariff_code) && typeof row.tariff_name === "string"
      && Number.isInteger(row.delivery_mode) && typeof row.period_min === "number"
      && Number.isFinite(row.period_min) && typeof row.period_max === "number"
      && Number.isFinite(row.period_max) && typeof row.delivery_sum === "number"
      && Number.isFinite(row.delivery_sum);
  }).map((item) => item as CdekTariff);
}

const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0 }).format(minor / 100);

export default function CdekSandbox({ apiBase, cdekYandexApiKey, yandexGeocoderApiKey, yandexSuggestApiKey, checkoutCart, onContinue }: Props) {
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
  const [allOffices, setAllOffices] = useState<CdekPoint[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("office");
  const [manualCourierAddress, setManualCourierAddress] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<CdekPoint | null>(null);
  const [error, setError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [mapCoordinates, setMapCoordinates] = useState<[number, number] | null>(null);
  const [isNationalMapView, setIsNationalMapView] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [cart, setCart] = useState<CartReviewRequest | null>(checkoutCart ?? null);
  const [cartReadFailed, setCartReadFailed] = useState(false);
  const [parcels, setParcels] = useState<ReturnType<typeof cdekParcelsResponseSchema.parse> | null>(null);
  const [parcelsLoading, setParcelsLoading] = useState(false);
  const [parcelsError, setParcelsError] = useState("");
  const [tariffs, setTariffs] = useState<CdekDeliveryOption[]>([]);
  const [selectedTariffCode, setSelectedTariffCode] = useState<number | null>(null);
  const [tariffsLoading, setTariffsLoading] = useState(false);
  const [tariffsError, setTariffsError] = useState("");
  const addressStep = useRef<HTMLElement | null>(null);
  const tariffStep = useRef<HTMLElement | null>(null);
  const widget = useRef<CdekWidgetInstance | null>(null);
  const officeSearchController = useRef<AbortController | null>(null);
  const initialSearchStarted = useRef(false);
  const servicePath = `${apiBase}/api/orders/cdek-widget`;
  const rankedOffices = offices.map((point) => ({ ...point, distance: distanceToOffice(point, mapCoordinates) }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  function scrollToStep(section: HTMLElement | null) {
    if (!section) return;
    const previousStepSpace = Math.min(window.innerHeight * 0.44, 360);
    window.scrollTo({
      top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - previousStepSpace),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    if (checkoutCart) {
      setCart(checkoutCart);
      setCartReadFailed(false);
      return;
    }
    const updateCart = (state: ReturnType<typeof readCart>) => {
      const parsed = cartReviewRequestSchema.safeParse({ version: 1, items: state.items.map(({ productSlug, variantSku, quantity }) => ({ slug: productSlug, sku: variantSku, quantity })) });
      setCartReadFailed(Boolean(state.error) || !parsed.success);
      setCart(parsed.success ? parsed.data : null);
    };
    updateCart(readCart());
    return subscribeToCart(updateCart);
  }, [checkoutCart]);

  useEffect(() => () => officeSearchController.current?.abort(), []);

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
    if (!apiEnabled || cartReadFailed || !cart?.items.length) {
      setParcels(null);
      setParcelsLoading(false);
      setParcelsError("");
      return;
    }

    let active = true;
    setParcels(null);
    setParcelsLoading(true);
    setParcelsError("");
    void fetch(`${apiBase}/api/orders/cdek-parcels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
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
  }, [apiBase, apiEnabled, cart, cartReadFailed]);

  useEffect(() => {
    if (!apiEnabled || initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    void findOffices({ city: "Москва" }, "Москва", true);
  }, [apiEnabled, findOffices]);

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
    if (!apiEnabled || deliveryMode !== "office" || !cdekYandexApiKey || !allOffices.length) return;
    let active = true;
    setMapReady(false);
    setMapError("");
    void loadCdekWidget().then(() => {
      if (!active || !window.CDEKWidget) return;
      widget.current = new window.CDEKWidget({
        // The map chooses the point; delivery prices are calculated in step 3.
        from: null, root: "cdek-sandbox-map-widget", apiKey: cdekYandexApiKey,
        servicePath, canChoose: true, popup: false,
        hideDeliveryOptions: { office: false, door: true }, goods: [], officesRaw: allOffices,
        defaultLocation: MOSCOW_MAP_CENTER, lang: "rus", currency: "RUB",
        onReady: () => {
          if (!active) return;
          setMapReady(true);
          void widget.current?.updateLocation(MOSCOW_MAP_CENTER, 10);
        },
        onChoose: (type, _tariff, target) => {
          if (type === "office" && "city_code" in target) {
            setDeliveryMode("office");
            setSelectedCode(target.code);
            setSelectedCityCode(target.city_code);
            setSelectedPoint({ code: target.code, name: target.name, address: target.address, city: target.city, type: target.type, postal_code: target.postal_code, location: { city_code: target.city_code, city: target.city, address: target.address } });
            scrollToStep(tariffStep.current);
          }
        },
      });
    }).catch((cause: unknown) => {
      if (active) setMapError(cause instanceof Error ? cause.message : "Карта СДЭК не загрузилась.");
    });
    return () => { active = false; widget.current?.destroy(); widget.current = null; };
  }, [allOffices, apiEnabled, cdekYandexApiKey, deliveryMode, servicePath]);

  useEffect(() => {
    if (mapReady && !isNationalMapView && mapCoordinates) void widget.current?.updateLocation(mapCoordinates, 13);
  }, [isNationalMapView, mapCoordinates, mapReady]);

  useEffect(() => {
    if (mapReady && selectedCode) widget.current?.selectOffice(selectedCode);
  }, [mapReady, selectedCode]);

  useEffect(() => {
    if (!apiEnabled || !parcels?.canCalculate) {
      setTariffs([]);
      setTariffsLoading(false);
      setTariffsError("");
      setSelectedTariffCode(null);
      return;
    }

    const deliveryAddress = selectedAddressText || [address?.city, address?.street, address?.house].filter(Boolean).join(", ");
    const destination = deliveryMode === "office"
      ? selectedCode && selectedCityCode ? { code: selectedCityCode } : null
      : address?.city?.trim() && address.street?.trim() && address.house?.trim()
        ? { address: deliveryAddress, country_code: "RU" }
        : null;

    if (!destination) {
      setTariffs([]);
      setTariffsLoading(false);
      setTariffsError(selectedCode && deliveryMode === "office" ? "Не удалось определить город выбранного ПВЗ." : "");
      setSelectedTariffCode(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTariffsLoading(true);
      setTariffsError("");
      try {
        const response = await fetch(servicePath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "calculate", currency: 1, lang: "rus", from_location: { address: "Москва" }, to_location: destination, packages: parcels.parcels }),
          signal: controller.signal,
        });
        const value: unknown = await response.json();
        if (!response.ok) throw new Error();
        const nextTariffs = selectCdekDeliveryOptions(parseTariffs(value), deliveryMode);
        if (controller.signal.aborted) return;
        setTariffs(nextTariffs);
        setSelectedTariffCode((current) => nextTariffs.some((option) => option.tariff?.tariff_code === current) ? current : nextTariffs.find((option) => option.tariff)?.tariff?.tariff_code ?? null);
      } catch {
        if (!controller.signal.aborted) {
          setTariffs([]);
          setSelectedTariffCode(null);
          setTariffsError("Не удалось рассчитать тарифы СДЭК для этого адреса.");
        }
      } finally {
        if (!controller.signal.aborted) setTariffsLoading(false);
      }
    }, 250);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [address?.city, address?.street, address?.house, apiEnabled, deliveryMode, parcels, selectedAddressText, selectedCityCode, selectedCode, servicePath]);

  function updateAddressQuery(value: string) {
    cancelOfficeSearch();
    setAddressQuery(value);
    setAddress(null);
    setSelectedAddressText("");
    setResultsAddress("");
    setSelectedCode("");
    setSelectedCityCode(null);
    setSelectedPoint(null);
    setError("");
    setApiMessage("");
  }

  function chooseDeliveryMode(mode: DeliveryMode) {
    if (mode === deliveryMode) {
      scrollToStep(addressStep.current);
      return;
    }
    cancelOfficeSearch();
    setDeliveryMode(mode);
    setSelectedCode("");
    setSelectedCityCode(null);
    setSelectedPoint(null);
    setError("");
    setApiMessage("");
    scrollToStep(addressStep.current);
  }

  function selectAddress(suggestion: YandexSuggestResult) {
    const parsed = parseYandexAddress(suggestion);
    if (!parsed.city?.trim()) {
      setError("В подсказке не найден город. Уточните адрес и выберите вариант с городом.");
      return;
    }
    const nextAddress: Address = { ...parsed };
    const displayAddress = formatYandexSuggestion(suggestion);
    setAddress(nextAddress);
    setAddressQuery(displayAddress);
    setSelectedAddressText(displayAddress);
    setSuggestions([]);
    setSuggestionError("");
    setResultsAddress("");
    setSelectedCode("");
    setSelectedCityCode(null);
    setSelectedPoint(null);
    setError("");
    setApiMessage("");
    if (deliveryMode === "office") void findOffices(nextAddress, displayAddress);
    else {
      setResultsAddress("");
      if (nextAddress.city?.trim() && nextAddress.street?.trim() && nextAddress.house?.trim()) scrollToStep(tariffStep.current);
    }
  }

  function updateCourierAddress(field: keyof Address, value: string) {
    const wasReady = Boolean(address?.city?.trim() && address.street?.trim() && address.house?.trim());
    const nextAddress = { ...address, [field]: value };
    setAddress(nextAddress);
    if (deliveryMode === "courier" && !wasReady && nextAddress.city?.trim() && nextAddress.street?.trim() && nextAddress.house?.trim()) scrollToStep(tariffStep.current);
    if (["region", "city", "street", "house"].includes(field)) {
      setAddressQuery("");
      setSelectedAddressText("");
    }
    setSuggestions([]);
  }

  function cancelOfficeSearch() {
    officeSearchController.current?.abort();
    officeSearchController.current = null;
    setLoading(false);
  }

  function toggleManualCourierAddress() {
    if (manualCourierAddress) {
      const searchText = [address?.city, address?.street, address?.house].filter(Boolean).join(", ");
      setAddressQuery(searchText);
      setSelectedAddressText(searchText);
    }
    setManualCourierAddress(!manualCourierAddress);
  }

  function submitAddress(event: { preventDefault(): void }) {
    event.preventDefault();
    if (deliveryMode === "courier") {
      if (!address?.city?.trim() || !address.street?.trim() || !address.house?.trim()) setError("Укажите город, улицу и дом для расчёта доставки.");
      return;
    }
    if (address && addressQuery.trim() === selectedAddressText) return;
    if (suggestions.length === 1) { selectAddress(suggestions[0]); return; }
    setError("Выберите подходящий адрес из подсказок.");
  }

  async function findOffices(searchAddress: Address, displayAddress: string, initial = false) {
    const cityName = searchAddress.city?.trim();
    if (!initial && !cityName) { setError("Выберите адрес с указанным городом."); return; }
    if (!apiEnabled) { setError("Проверьте настройки тестового API СДЭК в backend/.env."); return; }
    officeSearchController.current?.abort();
    const controller = new AbortController();
    officeSearchController.current = controller;
    setLoading(true);
    setError("");
    setSelectedCode("");
    setSelectedCityCode(null);
    setSelectedPoint(null);
    setResultsAddress("");
    try {
      let city: CdekCity | undefined;
      let cityCode = Number.NaN;
      if (!initial) {
        const cityUrl = new URL(servicePath);
        cityUrl.search = new URLSearchParams({ action: "cities", name: cityName!, country_code: "RU" }).toString();
        const cityResponse = await fetch(cityUrl, { signal: controller.signal });
        if (!cityResponse.ok) throw new Error(`СДЭК не нашёл город (HTTP ${cityResponse.status}).`);
        const cityCandidates = records<CdekCity>(await cityResponse.json());
        const requestedCity = normalizeCityName(cityName);
        city = cityCandidates.find((item) => normalizeCityName(item.city) === requestedCity
          || normalizeCityName(item.full_name) === requestedCity
          || normalizeCityName(item.full_name).startsWith(`${requestedCity},`));
        cityCode = Number(city?.code);
        if (!city || !Number.isInteger(cityCode) || cityCode <= 0) throw new Error(`СДЭК не подтвердил город «${cityName}». Уточните его название.`);
      }

      const officesUrl = new URL(servicePath);
      const params = new URLSearchParams({ action: "offices", ...(initial ? { country_code: "RU" } : { city_code: String(cityCode) }), type: "PVZ", lang: "rus" });
      officesUrl.search = params.toString();
      const officeResponse = await fetch(officesUrl, { signal: controller.signal });
      if (!officeResponse.ok) throw new Error(`СДЭК не вернул пункты выдачи (HTTP ${officeResponse.status}).`);
      const points = records<CdekPoint>(await officeResponse.json());
      let geocodeNote = "";
      let coordinates: [number, number] | null = null;
      let resolvedLocation = initial ? "Россия" : displayAddress || [city?.full_name || city?.city || cityName, searchAddress.street, searchAddress.house].filter(Boolean).join(", ");
      if (yandexGeocoderApiKey && !initial) {
        try {
          const geocoderUrl = new URL("https://geocode-maps.yandex.ru/v1/");
          geocoderUrl.search = new URLSearchParams({ apikey: yandexGeocoderApiKey, geocode: resolvedLocation, format: "json", results: "1" }).toString();
          const geocoderResponse = await fetch(geocoderUrl, { signal: controller.signal });
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
          if (controller.signal.aborted) return;
          const reason = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
          geocodeNote = ` Не удалось определить адрес${reason}. Показаны пункты города без сортировки по расстоянию.`;
        }
      }
      if (controller.signal.aborted) return;
      setOffices(points);
      if (initial) setAllOffices(points);
      setMapCoordinates(coordinates);
      setIsNationalMapView(initial);
      setResultsAddress(initial ? "" : displayAddress);
      setApiMessage(initial ? "" : `Найдено ПВЗ: ${points.length}.${geocodeNote}`);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Не удалось получить пункты выдачи СДЭК.");
    } finally {
      if (officeSearchController.current === controller) {
        officeSearchController.current = null;
        setLoading(false);
      }
    }
  }

  const visibleOffices = rankedOffices.slice(0, 5);
  const selectedOption = tariffs.find((option) => option.tariff?.tariff_code === selectedTariffCode);
  const selectedTariff = selectedOption?.tariff;
  const destinationReady = deliveryMode === "office"
    ? Boolean(selectedCode && selectedCityCode && selectedPoint)
    : Boolean((address?.region?.trim() || address?.city?.trim()) && address?.city?.trim() && address.street?.trim() && address.house?.trim());

  function continueToCheckout() {
    if (!onContinue || !destinationReady) return;
    const tariff = {
      tariffCode: selectedTariff?.tariff_code ?? null,
      tariffName: selectedTariff?.tariff_name ?? null,
      periodMin: selectedTariff?.period_min ?? null,
      periodMax: selectedTariff?.period_max ?? null,
      shippingMinor: selectedTariff ? Math.round(selectedTariff.delivery_sum * 100) : null,
    };
    if (deliveryMode === "office" && selectedPoint && selectedCityCode) {
      onContinue({
        mode: "office",
        point: {
          code: selectedPoint.code,
          cityCode: selectedCityCode,
          city: selectedPoint.location?.city || selectedPoint.city || address?.city || "",
          name: selectedPoint.name || selectedPoint.code,
          address: officeAddress(selectedPoint),
          type: selectedPoint.type || "PVZ",
          postalCode: selectedPoint.postal_code ?? "",
        },
        tariff,
      });
      return;
    }
    if (deliveryMode === "courier" && address) {
      onContinue({
        mode: "courier",
        address: {
          region: address.region ?? address.city ?? "",
          city: address.city ?? "",
          street: address.street ?? "",
          house: address.house ?? "",
          apartment: address.apartment ?? "",
          postcode: address.postcode ?? "",
        },
        tariff,
      });
    }
  }

  function renderTariffState() {
    if (cartReadFailed) return <p className="checkout-error" role="alert">Не удалось прочитать корзину в этом браузере.</p>;
    if (!cart?.items.length) return <p className="checkout-hint" role="status">Добавьте товар в <a href="/cart">корзину</a>, чтобы рассчитать стоимость.</p>;
    if (parcelsLoading) return <p className="checkout-hint" role="status">Получаем вес и габариты товаров…</p>;
    if (parcelsError) return <p className="checkout-error" role="alert">{parcelsError}</p>;
    if (!parcels?.canCalculate) return parcels
      ? <p className="checkout-hint" role="status">Не хватает веса или габаритов у {parcels.missingItems} позиций, поэтому стоимость не рассчитана.</p>
      : <p className="checkout-hint">Для расчёта добавьте товар в корзину.</p>;
    if (!selectedCode && deliveryMode === "office") return <p className="checkout-hint" role="status">Сначала выберите пункт выдачи на карте или справа.</p>;
    if (deliveryMode === "courier" && !(address?.city?.trim() && address.street?.trim() && address.house?.trim())) return <p className="checkout-hint" role="status">Укажите город, улицу и дом — появятся тарифы для курьерской доставки.</p>;
    if (tariffsLoading) return <p className="checkout-hint" role="status">Рассчитываем тарифы СДЭК…</p>;
    if (tariffsError) return <p className="checkout-error" role="alert">{tariffsError}</p>;
    if (tariffs.length === 0) return <p className="checkout-hint" role="status">Для этого адреса тарифы не найдены.</p>;
    return <ul className="cdek-sandbox-tariffs" aria-live="polite">{tariffs.map(({ label, tariff }) => <li key={label}>
      <button className={`cdek-sandbox-tariff${tariff && selectedTariffCode === tariff.tariff_code ? " is-selected" : ""}`} type="button" disabled={!tariff} aria-pressed={Boolean(tariff && selectedTariffCode === tariff.tariff_code)} onClick={() => tariff && setSelectedTariffCode(tariff.tariff_code)}>
        <span className="cdek-sandbox-tariff-copy"><strong>{label}</strong><small>{tariff ? deliveryMode === "office" ? "До пункта выдачи СДЭК" : "Курьером по адресу" : "Недоступна для этого адреса и корзины"}</small></span>
        {tariff && <span className="cdek-sandbox-tariff-meta"><strong>{money(Math.round(tariff.delivery_sum * 100))}</strong><small>{tariff.period_min === tariff.period_max ? `${tariff.period_min} дн.` : `${tariff.period_min}–${tariff.period_max} дн.`}</small></span>}
      </button>
    </li>)}</ul>;
  }

  return <div className="cdek-sandbox">
    <h1 className="sr-only">Доставка</h1>
    <section className="cdek-sandbox-panel" aria-labelledby="cdek-delivery-title">
      <h2 id="cdek-delivery-title" tabIndex={-1}>1. Способ доставки</h2>
      <p className="cdek-sandbox-step-description">Выберите, как хотите получить заказ.</p>
      <div className="checkout-delivery-options" role="group" aria-label="Способ получения">
        <button className={`checkout-delivery-option${deliveryMode === "office" ? " is-selected" : ""}`} type="button" aria-pressed={deliveryMode === "office"} onClick={() => chooseDeliveryMode("office")}>
          <strong>СДЭК</strong><span>Пункт выдачи (ПВЗ)</span><small>Заберите заказ в удобном пункте</small>
        </button>
        <button className={`checkout-delivery-option${deliveryMode === "courier" ? " is-selected" : ""}`} type="button" aria-pressed={deliveryMode === "courier"} onClick={() => chooseDeliveryMode("courier")}>
          <strong>СДЭК</strong><span>Курьер</span><small>Доставка по адресу</small>
        </button>
      </div>
    </section>

    <section className="cdek-sandbox-panel" aria-labelledby="cdek-address-title" ref={addressStep}>
      <h2 id="cdek-address-title">2. Адрес</h2>
      <p className="cdek-sandbox-step-description">{deliveryMode === "office" ? "Выберите пункт выдачи на карте или найдите ближайшие по адресу." : "Введите адрес, куда привезёт курьер."}</p>
      <form className="cdek-sandbox-form" onSubmit={submitAddress}>
        {(deliveryMode === "office" || !manualCourierAddress) && <div className="checkout-address-suggest">
          <div className="checkout-field-control">
            <input className="cdek-sandbox-address-input" id="cdek-address-search" type="text" autoComplete="shipping street-address" aria-label="Адрес" disabled={loading || apiEnabled === null} value={addressQuery} placeholder={deliveryMode === "office" ? "Например, Азовская улица, Москва" : "Москва, Лесная улица, 3"} onChange={(event) => updateAddressQuery(event.currentTarget.value)} onBlur={() => window.setTimeout(() => setSuggestions([]), 120)} onKeyDown={(event) => { if (event.key === "Escape") setSuggestions([]); }} />
          </div>
          {suggestions.length > 0 && <ul className="checkout-address-suggest-list" id="cdek-address-suggestions">{suggestions.map((suggestion, index) => <li key={`${formatYandexSuggestion(suggestion)}-${index}`}><button className="checkout-address-suggest-option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAddress(suggestion)}><strong>{suggestion.title?.text || formatYandexSuggestion(suggestion)}</strong>{suggestion.subtitle?.text && <span>{suggestion.subtitle.text}</span>}</button></li>)}</ul>}
        </div>}
        {deliveryMode === "courier" && <div className="checkout-fields checkout-fields-address">
          {courierAddressFields.map(([field, label, type, autoComplete, maxLength]) => <div className="checkout-field" key={field}>
            <label className="sr-only" htmlFor={`cdek-address-${field}`}>{label}</label>
            <div className="checkout-field-control">
              <input className="cdek-sandbox-address-input" id={`cdek-address-${field}`} name={field} type={type} inputMode={field === "postcode" ? "numeric" : undefined} autoComplete={`shipping ${autoComplete}`} maxLength={maxLength} required={field === "house"} value={address?.[field] ?? ""} placeholder={label} onChange={(event) => updateCourierAddress(field, event.currentTarget.value)} />
            </div>
          </div>)}
        </div>}
        {deliveryMode === "courier" && <>
          <button className="checkout-text-button" type="button" aria-expanded={manualCourierAddress} aria-controls="cdek-manual-address-fields" onClick={toggleManualCourierAddress}>{manualCourierAddress ? "Скрыть ручной ввод" : "Ввести адрес вручную"}</button>
          <div className="checkout-fields checkout-manual-address" id="cdek-manual-address-fields" hidden={!manualCourierAddress}>
            {manualCourierAddressFields.map(([field, label, type, autoComplete, maxLength]) => <div className="checkout-field" key={field}>
              <label className="sr-only" htmlFor={`cdek-address-${field}`}>{label}</label>
              <div className="checkout-field-control">
                <input className="cdek-sandbox-address-input" id={`cdek-address-${field}`} name={field} type={type} autoComplete={`shipping ${autoComplete}`} maxLength={maxLength} required={manualCourierAddress} value={address?.[field] ?? ""} placeholder={label} onChange={(event) => updateCourierAddress(field, event.currentTarget.value)} />
              </div>
            </div>)}
          </div>
        </>}
        {suggestionsLoading && <p className="checkout-hint" role="status">Ищем адрес…</p>}
        {suggestionError && <p className="checkout-error" role="alert">{suggestionError}</p>}
        {!yandexSuggestApiKey && deliveryMode === "office" && <p className="checkout-error" role="alert">Не настроен ключ Яндекс Геосаджеста для подсказок адреса.</p>}
        {!yandexSuggestApiKey && deliveryMode === "courier" && !manualCourierAddress && <p className="checkout-hint" role="status">Подсказки выключены — введите адрес вручную.</p>}
        {loading && <p className="checkout-hint" role="status">Ищем ближайшие пункты выдачи…</p>}
        {!checkoutCart && apiMessage && deliveryMode === "office" && <p className="checkout-hint" role="status">{apiMessage}</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
      </form>

      {deliveryMode === "office" ? <div className={`cdek-sandbox-address-grid${resultsAddress && offices.length > 0 ? " is-expanded" : ""}`}>
        <section className="cdek-sandbox-map-panel" aria-labelledby="cdek-map-title">
          <div className="cdek-sandbox-map-frame">
            <div className="cdek-sandbox-map" id="cdek-sandbox-map-widget" aria-label="Интерактивная карта пунктов выдачи СДЭК" />
            {!mapReady && <div className="cdek-sandbox-map-placeholder">
              <span className="cdek-sandbox-map-pin" aria-hidden="true">⌖</span>
              <strong>{mapError || (cdekYandexApiKey ? "Загружаем карту СДЭК…" : "Карта СДЭК")}</strong>
              <span>{cdekYandexApiKey ? "Карта появится после загрузки списка пунктов." : "Для отображения карты настройте ключ Яндекс JavaScript API."}</span>
            </div>}
          </div>
        </section>

        {resultsAddress && <aside className="cdek-sandbox-results" aria-live="polite" aria-label="Ближайшие пункты выдачи">
          {offices.length > 0 ? <>
            <h3>{mapCoordinates ? "Ближайшие пункты выдачи" : "Пункты выдачи"}</h3>
            <p className="checkout-hint">{mapCoordinates ? `Показаны ${visibleOffices.length} ближайших из ${offices.length}; расстояние по прямой.` : "Не удалось определить расстояние; показаны пункты города."}</p>
            <ul>{visibleOffices.map((point) => <li key={point.code}>
              <button className={`cdek-sandbox-point${selectedCode === point.code ? " is-selected" : ""}`} type="button" aria-pressed={selectedCode === point.code} onClick={() => { setSelectedCode(point.code); setSelectedCityCode(point.location?.city_code ?? null); setSelectedPoint(point); scrollToStep(tariffStep.current); }}>
                <strong>{point.location?.city || point.city || address?.city || "Москва"}, {officeAddress(point)}</strong>
                <small>{point.code}{point.distance !== null ? ` · ${point.distance < 1000 ? `${Math.round(point.distance)} м` : `${(point.distance / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} км`} от адреса` : ""}</small>
                {point.work_time && <small>{point.work_time}</small>}
              </button>
            </li>)}</ul>
          </> : <p>Для выбранного адреса пункты выдачи не найдены.</p>}
        </aside>}
      </div> : null}
    </section>

    <section className="cdek-sandbox-panel" aria-labelledby="cdek-tariff-title" ref={tariffStep}>
      <h2 id="cdek-tariff-title">3. Тариф</h2>
      <p className="cdek-sandbox-step-description">Выберите удобный вариант доставки. Стоимость рассчитывается по корзине.</p>
      {renderTariffState()}
      <div className="checkout-actions cdek-sandbox-actions">
        {selectedTariff && <p className="cdek-sandbox-total"><span>Стоимость доставки</span><strong>{money(Math.round(selectedTariff.delivery_sum * 100))}</strong></p>}
        {onContinue ? <button className="store-primary-button" type="button" disabled={!destinationReady} onClick={continueToCheckout}>Перейти к оплате</button> : <a className="store-primary-button" href="/checkout">Перейти к оплате</a>}
      </div>
    </section>
  </div>;
}
