import { WATTICO_CHARACTERISTICS_BY_SKU, WATTICO_SHARED_SL69_CHARACTERISTICS } from "./wattico-characteristics";

export type Product = {
  slug: string;
  sku: string;
  name: string;
  category: string;
  rawCategory: string;
  price: number;
  oldPrice?: number;
  description: string;
  packageContents: string;
  characteristics: string;
  variantCharacteristics?: Record<string, string>;
  image: string;
  variants: ProductVariant[];
};

export type Availability = "in-stock" | "preorder" | "unavailable";

export const ALL_PRODUCTS_LABEL = "Все товары";

const PORTABLE_STATION_CATEGORY = "Портативные зарядные станции";
const VOLTAGE_INVERTER_CATEGORY = "Инвертора напряжения";
const LIFEPO4_CATEGORY = "LiFePO₄ аккумуляторы";

export function normalizeStationText(value: string) {
  return value.replace(/\bSL(?=\s*[-]?\d)/gi, "NS");
}

export function displayProductSku(product: Product, sku = product.sku) {
  return product.category === PORTABLE_STATION_CATEGORY ? normalizeStationText(sku) : sku;
}

export type ProductVariant = {
  sku: string;
  label: string;
  price: number;
  oldPrice?: number;
  availability: Availability;
  sourceSlug?: string;
};

export const HERO_CATEGORIES = [
  { title: "ПОРТАТИВНЫЕ ЗАРЯДНЫЕ СТАНЦИИ", label: "Портативные зарядные станции", category: "Портативные зарядные станции", image: "/assets/images/category-portable-charging-stations.webp", icon: "/assets/images/category-icons/portable-charging-station.png" },
  { title: "AGM АККУМУЛЯТОРЫ", label: "AGM аккумуляторы", category: "AGM аккумуляторы", image: "/assets/images/category-agm-batteries.webp", icon: "/assets/images/category-icons/agm-battery.png" },
  { title: "LiFePO4 АККУМУЛЯТОРЫ", label: LIFEPO4_CATEGORY, category: LIFEPO4_CATEGORY, image: "/assets/images/category-lifepo4-batteries.webp", icon: "/assets/images/category-icons/lifepo4-battery.png" },
  { title: "ИНВЕРТОРА НАПРЯЖЕНИЯ", label: VOLTAGE_INVERTER_CATEGORY, category: VOLTAGE_INVERTER_CATEGORY, image: "/assets/images/category-automotive-inverters.webp", icon: "/assets/images/category-icons/automotive-inverter.png" },
  { title: "ГИБРИДНЫЕ ИНВЕРТОРЫ", label: "Гибридные инверторы", category: "Гибридные инверторы", image: "/assets/images/category-hybrid-inverters.webp", icon: "/assets/images/category-icons/hybrid-inverter.png" },
  { title: "СИСТЕМЫ ХРАНЕНИЯ ЭНЕРГИИ ESS", label: "Системы хранения энергии ESS", category: "Системы хранения энергии ESS", image: "/assets/images/category-energy-storage-ess.webp", icon: "/assets/images/category-icons/energy-storage-ess.png" },
  { title: "СОЛНЕЧНЫЕ ПАНЕЛИ", label: "Солнечные панели", category: "Солнечные панели", image: "/assets/images/category-solar-panels.webp", icon: "/assets/images/category-icons/solar-panel.png" },
  { title: "POWERBANK", label: "POWERBANK", category: "POWERBANK", image: "/assets/images/category-powerbanks.webp", icon: "/assets/images/category-icons/powerbank.png" },
] as const;

export type CatalogApiProduct = {
  slug: string;
  name: string;
  category: string;
  images: string[];
  shortDescription: string;
  description: string;
  characteristics: Record<string, string>;
  packageContents: string[];
  variants: Array<{
    sku: string;
    label: string;
    price: number;
    oldPrice?: number;
    availability: Availability;
  }>;
};

type CatalogApiResponse = {
  items: CatalogApiProduct[];
};

type CatalogSelection = Record<string, readonly string[]>;

// The CSV contains 53 catalog rows. Product data still comes only from WooCommerce;
// this allow-list excludes unrelated legacy and test products that are also published there.
const catalogArticlesBySlug: CatalogSelection = Object.fromEntries([
  "invertor-avtomobilnyy-3500",
  "invertor-avtomobilnyy-600",
  "invertor-avtomobilnyy-3000",
  "invertor-avtomobilnyy-2500",
  "invertor-avtomobilnyy-1800",
  "invertor-avtomobilnyy-2300",
  "invertor-avtomobilnyy-800",
  "invertor-avtomobilnyy-1600",
  "invertor-avtomobilnyy-1200",
  "invertor-avtomobilnyy-1300",
  "portativnaya-solnechnaya-panel-30w-18-v",
  "gibkaya-solnechnaya-panel-210w-33-9v",
  "portativnaya-solnechnaya-panel-100w-20v",
  "solnechnaya-panel-450-vt-41-v",
  "sistema-hraneniya-energii-ess-1-280-vt-ch-600-vt",
  "sistema-hraneniya-energii-ess-2-560-vt-ch-1-200-vt",
  "sistema-hraneniya-energii-ess-2-560-vt-ch-3-5-kvt",
  "sistema-hraneniya-energii-ess-5-120-vt-ch-6-2-kvt",
  "sistema-hraneniya-energii-ess-10-240-vt-ch-6-2-kvt",
  "gibkaya-solnechnaya-panel-30w-18v",
  "gibkaya-solnechnaya-panel-100w-17v",
  "gibkaya-solnechnaya-panel-50w-18v",
  "portativnaya-solnechnaya-panel-50w-18v",
  "portativnaya-zaryadnaya-stantsiya-500w-160000mah",
  "portativnaya-elektrostantsiya-168000-mah-600w",
  "portativnaya-zaryadnaya-stantsiya-300vt-64000-mah-205wh",
  "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah",
  "portativnaya-elektrostantsiya-320000-mah-1000w-1024wh",
  "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2",
  "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh",
  "portativnaya-zaryadnaya-stantsiya-300-vt-96000-mah",
  "portativnaya-zaryadnaya-stantsiya-300-w-72000-mah",
  "portativnaya-zaryadnaya-stantsiya-500-vt-112500-mah-360wh",
  "portativnaya-elektrostantsiya-560000-mah-2000w-1792wh",
  "portativnaya-elektrostantsiya-240000-mah-800w",
  "vneshniy-akkumulyator-50000-mah-s-bystroy-zaryadkoy",
  "vneshniy-akkumulyator-60000-mah-s-bystroy-zaryadkoy",
  "vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy",
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-200ah-12v",
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-65ah-12v",
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-70ah-12v",
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-90ah-12v-2",
  "svintsovo-kislotnyy-germetichnyy-akkumulyator-100ah-12v-2",
  "portativnaya-zaryadnaya-stantsiya-sl-54-s-radio-i-bluetooth-150-vt-153-6-vt-ch",
  "avtonomnyy-gibridnyy-invertor-ibp-1-2-kvt",
  "avtonomnyy-gibridnyy-invertor-ibp-3-6-kvt",
  "avtonomnyy-gibridnyy-invertor-ibp-6-5-kvt",
  "avtonomnyy-gibridnyy-invertor-ibp-12-kvt",
  "litiy-zhelezo-fosfatnyy-akkumulyator-nsw-51-2-v-100-a-ch",
  "litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-100-a-ch",
  "litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-200-a-ch",
  "litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-100-a-ch",
  "litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-200-a-ch",
].map((slug) => [slug, []])) as CatalogSelection;
type CatalogModelGroup = {
  name: string;
  description: string;
  canonicalSlug: string;
  memberSlugs: readonly string[];
};

const catalogModelGroups = [
  {
    name: "Автомобильный инвертор — чистая синусоида",
    description: "Автомобильный инвертор с чистой синусоидой и выбором мощности под вашу нагрузку.",
    canonicalSlug: "invertor-avtomobilnyy-800",
    memberSlugs: [
      "invertor-avtomobilnyy-800",
      "invertor-avtomobilnyy-1300",
      "invertor-avtomobilnyy-1800",
      "invertor-avtomobilnyy-2500",
      "invertor-avtomobilnyy-3000",
      "invertor-avtomobilnyy-3500",
    ],
  },
  {
    name: "Автомобильный инвертор — модифицированная синусоида",
    description: "Автомобильный инвертор с модифицированной синусоидой и выбором мощности.",
    canonicalSlug: "invertor-avtomobilnyy-600",
    memberSlugs: [
      "invertor-avtomobilnyy-600",
      "invertor-avtomobilnyy-1200",
      "invertor-avtomobilnyy-1600",
      "invertor-avtomobilnyy-2300",
    ],
  },
  {
    name: "Портативная зарядная станция NS-93",
    description: "Портативная зарядная станция NS-93 с выбором мощности и ёмкости.",
    canonicalSlug: "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh",
    memberSlugs: [
      "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-153-6wh",
      "portativnaya-zaryadnaya-stantsiya-300vt-64000-mah-205wh",
      "portativnaya-zaryadnaya-stantsiya-500-vt-112500-mah-360wh",
    ],
  },
  {
    name: "Портативная зарядная станция NS-69",
    description: "Портативная зарядная станция NS-69 с выбором мощности и ёмкости.",
    canonicalSlug: "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah",
    memberSlugs: [
      "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah",
      "portativnaya-zaryadnaya-stantsiya-300-w-72000-mah",
      "portativnaya-zaryadnaya-stantsiya-500w-160000mah",
    ],
  },
  {
    name: "Портативная зарядная станция NS-63",
    description: "Портативная зарядная станция NS-63 с выбором мощности.",
    canonicalSlug: "portativnaya-elektrostantsiya-168000-mah-600w",
    memberSlugs: [
      "portativnaya-elektrostantsiya-168000-mah-600w",
      "portativnaya-elektrostantsiya-240000-mah-800w",
    ],
  },
  {
    name: "Портативная зарядная станция NS-31",
    description: "Портативная зарядная станция NS-31 с выбором мощности и ёмкости.",
    canonicalSlug: "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2",
    memberSlugs: [
      "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2",
      "portativnaya-zaryadnaya-stantsiya-300-vt-96000-mah",
    ],
  },
  {
    name: "Портативная солнечная панель",
    description: "Портативная солнечная панель с выбором мощности.",
    canonicalSlug: "portativnaya-solnechnaya-panel-30w-18-v",
    memberSlugs: [
      "portativnaya-solnechnaya-panel-30w-18-v",
      "portativnaya-solnechnaya-panel-50w-18v",
      "portativnaya-solnechnaya-panel-100w-20v",
      "solnechnaya-panel-450-vt-41-v",
    ],
  },
  {
    name: "Гибкая солнечная панель",
    description: "Гибкая солнечная панель с выбором мощности.",
    canonicalSlug: "gibkaya-solnechnaya-panel-30w-18v",
    memberSlugs: [
      "gibkaya-solnechnaya-panel-30w-18v",
      "gibkaya-solnechnaya-panel-50w-18v",
      "gibkaya-solnechnaya-panel-100w-17v",
      "gibkaya-solnechnaya-panel-210w-33-9v",
    ],
  },
  {
    name: "Гибридный инвертор ИБП",
    description: "Автономный гибридный инвертор с выбором мощности.",
    canonicalSlug: "avtonomnyy-gibridnyy-invertor-ibp-1-2-kvt",
    memberSlugs: [
      "avtonomnyy-gibridnyy-invertor-ibp-1-2-kvt",
      "avtonomnyy-gibridnyy-invertor-ibp-3-6-kvt",
      "avtonomnyy-gibridnyy-invertor-ibp-6-5-kvt",
      "avtonomnyy-gibridnyy-invertor-ibp-12-kvt",
    ],
  },
  {
    name: "Система хранения энергии ESS",
    description: "Система хранения энергии ESS с выбором мощности и ёмкости.",
    canonicalSlug: "sistema-hraneniya-energii-ess-1-280-vt-ch-600-vt",
    memberSlugs: [
      "sistema-hraneniya-energii-ess-1-280-vt-ch-600-vt",
      "sistema-hraneniya-energii-ess-2-560-vt-ch-1-200-vt",
      "sistema-hraneniya-energii-ess-2-560-vt-ch-3-5-kvt",
      "sistema-hraneniya-energii-ess-5-120-vt-ch-6-2-kvt",
      "sistema-hraneniya-energii-ess-10-240-vt-ch-6-2-kvt",
    ],
  },
  {
    name: "AGM аккумулятор 12 В",
    description: "Герметичный AGM-аккумулятор с выбором ёмкости.",
    canonicalSlug: "svintsovo-kislotnyy-germetichnyy-akkumulyator-65ah-12v",
    memberSlugs: [
      "svintsovo-kislotnyy-germetichnyy-akkumulyator-65ah-12v",
      "svintsovo-kislotnyy-germetichnyy-akkumulyator-70ah-12v",
      "svintsovo-kislotnyy-germetichnyy-akkumulyator-90ah-12v-2",
      "svintsovo-kislotnyy-germetichnyy-akkumulyator-100ah-12v-2",
      "svintsovo-kislotnyy-germetichnyy-akkumulyator-200ah-12v",
    ],
  },
  {
    name: "LiFePO4 аккумулятор NSR 51,2 В",
    description: "Литий-железо-фосфатный аккумулятор NSR с выбором ёмкости.",
    canonicalSlug: "litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-100-a-ch",
    memberSlugs: [
      "litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-100-a-ch",
      "litiy-zhelezo-fosfatnyy-akkumulyator-nsr-51-2-v-200-a-ch",
    ],
  },
  {
    name: "LiFePO4 аккумулятор NSLFP 12,8 В",
    description: "Литий-железо-фосфатный аккумулятор NSLFP с выбором ёмкости.",
    canonicalSlug: "litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-100-a-ch",
    memberSlugs: [
      "litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-100-a-ch",
      "litiy-zhelezo-fosfatnyy-akkumulyator-nslfp-12-8-v-200-a-ch",
    ],
  },
  {
    name: "POWERBANK",
    description: "POWERBANK с выбором ёмкости.",
    canonicalSlug: "vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy",
    memberSlugs: [
      "vneshniy-akkumulyator-20000-mah-s-bystroy-zaryadkoy",
      "vneshniy-akkumulyator-50000-mah-s-bystroy-zaryadkoy",
      "vneshniy-akkumulyator-60000-mah-s-bystroy-zaryadkoy",
    ],
  },
] satisfies readonly CatalogModelGroup[];

const sl69Description = "Портативная зарядная станция NS-69 на LiFePO4-аккумуляторе с тремя конфигурациями: L1 — 150 Вт, L2 — 300 Вт и L4 — 500 Вт. Станция оснащена выходами AC 220 В, DC 12 В, USB-A и USB-C, позволяет подключать до 10 устройств и поддерживает сквозное питание. Она подходит для кемпинга, дачи, дома, поездок и мест без доступа к сети. Заряжать станцию можно от сети через адаптер или от солнечной панели мощностью до 200 Вт. Заявленный ресурс аккумулятора — 3500+ циклов (80%+).";
const sl69PackageContents = [
  "Портативная станция питания — 1 шт.",
  "Адаптер переменного тока (AC) — 1 шт.",
  "Руководство пользователя — 1 шт.",
  "Дополнительная опция: светодиодный фонарик с кабелем 5 м — 4 шт. (подарок от продавца).",
].join("\n");
const sl69Characteristics = [
  "Модель L1: 150 Вт",
  "Аккумулятор L1: 12,8 В / 12 000 мА·ч",
  "Эквивалент L1 при 3,2 В: 48 000 мА·ч",
  "Расчётная ёмкость L1: ≈153,6 Вт·ч (12,8 В × 12 А·ч)",
  "Расчётное минимальное время зарядки L1 от солнечного входа 200 Вт: ≈46 мин",
  "Вес L1: 2,38 кг",
  "Модель L2: 300 Вт",
  "Аккумулятор L2: 12,8 В / 18 000 мА·ч",
  "Эквивалент L2 при 3,2 В: 72 000 мА·ч",
  "Расчётная ёмкость L2: ≈230,4 Вт·ч (12,8 В × 18 А·ч)",
  "Расчётное минимальное время зарядки L2 от солнечного входа 200 Вт: ≈69 мин",
  "Вес L2: 2,9 кг",
  "Модель L4: 500 Вт",
  "Аккумулятор L4: 12,8 В / 42 000 мА·ч",
  "Эквивалент L4 при 3,2 В: 168 000 мА·ч",
  "Расчётная ёмкость L4: ≈537,6 Вт·ч (12,8 В × 42 А·ч)",
  "Расчётное минимальное время зарядки L4 от солнечного входа 200 Вт: ≈2 ч 41 мин",
  "Вес L4: 4,5 кг",
  "Тип аккумулятора: LiFePO4",
  "Тип: портативная зарядная станция",
  "Выходные интерфейсы: USB, USB Type-C, DC, AC",
  "Количество выходных разъёмов: 10",
  "Макс. выходной ток: 5 (единица измерения не указана на странице Ozon)",
  "Назначение: для бытовых приборов",
  "Основной материал корпуса: пластик",
  "Функция беспроводной зарядки: нет",
  "Выход постоянного тока (DC): 12 В",
  "USB-A: 5 В / 3 А",
  "USB-C: 5 В / 3 А",
  "Напряжение зарядки: 14,6 В",
  "Ресурс аккумулятора: 3500+ циклов (80%+)",
  "Рабочая температура: от 0 до +40 °C",
  "Максимальная мощность солнечного входа: ≤ 200 Вт",
  "Выход переменного тока: 220 В",
  "AC 220 В: 2 розетки",
  "DC 12 В: 4 круглых выхода",
  "DC-вход: зарядка от сети или солнечной панели",
  "Разъем XT-60: подключение солнечной панели",
  "Размер станции: 23,7 × 16,5 × 22,1 см",
  "Размер упаковки: 33,5 × 21 × 26 см",
  "Тип выходного сигнала AC: не указан производителем",
  "Время полной зарядки от сети: не рассчитано — мощность AC-адаптера не указана производителем",
  "Ограничение расчёта зарядки: солнечные значения — теоретический минимум при стабильных 200 Вт без учёта потерь и замедления в конце зарядки",
  "Количество USB-A и USB-C портов: не указано производителем",
  "Максимальный ток DC-выхода: не указан производителем",
  "Количество в упаковке: 1 шт.",
  "Упаковка: коробка",
  "Срок службы: 5 лет",
  "Страна-изготовитель: Россия",
  "Особенности: зарядка двух устройств, ноутбуков, индикатор ёмкости, дисплей, Type-C",
  "Гарантия: 12 месяцев",
].join("\n");
const sl69Image = "/assets/images/sl69-station.png";
const sl31Image = "/assets/images/sl31-station.png";

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  "in-stock": "В наличии",
  preorder: "Предзаказ",
  unavailable: "Недоступен",
};

const apiBase = (import.meta.env.SSR && import.meta.env.CATALOG_BUILD_API_URL || import.meta.env.PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
let catalogPromise: Promise<Product[]> | undefined;

export async function loadCatalogProducts() {
  catalogPromise ??= fetch(`${apiBase}/api/catalog?perPage=100&sort=popularity`, {
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`WooCommerce catalog request failed: ${response.status}`);
    const payload = await response.json() as CatalogApiResponse;
    if (!payload || !Array.isArray(payload.items)) throw new Error("WooCommerce catalog response is invalid");
    return selectCatalogProducts(payload.items);
  }).catch((error) => {
    // Allow a later retry when the API was still starting during static/dev boot.
    catalogPromise = undefined;
    throw error;
  });

  return catalogPromise;
}

export function selectCatalogProducts(
  products: CatalogApiProduct[],
  selection: CatalogSelection = catalogArticlesBySlug,
) {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const missing = Object.keys(selection).filter((slug) => !productsBySlug.has(slug));
  if (missing.length > 0) throw new Error(`WooCommerce catalog is missing selected products: ${missing.join(", ")}`);

  return groupCatalogProducts(Object.entries(selection).map(([slug, articles]) => mapCatalogProduct(productsBySlug.get(slug)!, articles)));
}

export function mapCatalogProduct(product: CatalogApiProduct, articles: readonly string[] = []): Product {
  const category = categoryLabel(product.category, product.name);
  const normalize = category === PORTABLE_STATION_CATEGORY ? normalizeStationText : (value: string) => value;
  const variants = product.variants.map((variant) => ({ ...variant, sourceSlug: product.slug }));
  const primary = variants[0];
  if (!primary) throw new Error(`WooCommerce product ${product.slug} has no variants`);
  const article = articles[0] ?? primary.sku;
  const watticoRows = WATTICO_CHARACTERISTICS_BY_SKU[primary.sku as keyof typeof WATTICO_CHARACTERISTICS_BY_SKU];
  const characteristicLines = watticoRows
    ? watticoRows.map(([label, value]) => normalize(`${label}: ${value}`))
    : Object.entries(product.characteristics)
      .filter(([label]) => label !== "Артикул")
      .map(([label, value]) => normalize(`${label}: ${value}`));

  return {
    slug: product.slug,
    sku: article,
    name: normalize(product.name),
    category,
    rawCategory: product.category,
    price: primary.price,
    ...(primary.oldPrice !== undefined ? { oldPrice: primary.oldPrice } : {}),
    description: normalize(stripHtml(product.description || product.shortDescription)),
    packageContents: normalize(product.packageContents.join("\n")),
    characteristics: [
      normalize(`Артикул: ${article}`),
      ...(articles.length > 1 ? [normalize(`Дополнительные артикулы: ${articles.slice(1).join(", ")}`)] : []),
      ...characteristicLines,
    ].join("\n"),
    image: product.images[0] ?? "/assets/images/gear-menu.webp",
    variants,
  };
}

function categoryLabel(value: string, name = "") {
  if (value === "invertory") return /гибридн|автономный/i.test(name) ? "Гибридные инверторы" : VOLTAGE_INVERTER_CATEGORY;
  if (value === "akkumulyatory") return /LiFePO4|литий-железо-фосфатный|NSW|NSR|NSLFP/i.test(name) ? LIFEPO4_CATEGORY : "AGM аккумуляторы";

  const labels: Record<string, string> = {
    "charging-stations": "Портативные зарядные станции",
    "portativnye-stantsii": "Портативные зарядные станции",
    gibkie: "Солнечные панели",
    "power-bank": "POWERBANK",
    "gibridnye-invertory": "Гибридные инверторы",
    "sistema-hraneniya-energii-ess": "Системы хранения энергии ESS",
    "solnechnye-paneli": "Солнечные панели",
    "zaryadnye-stantsii": "Портативные зарядные станции",
  };
  return labels[value] ?? value.replace(/[-_]+/g, " ");
}

export function groupCatalogProducts(products: Product[]) {
  const groupsBySlug = new Map(catalogModelGroups.flatMap((group) => group.memberSlugs.map((slug) => [slug, group] as const)));
  const result: Product[] = [];
  const groupedSlugs = new Set<string>();

  for (const product of products) {
    if (groupedSlugs.has(product.slug)) continue;
    const group = groupsBySlug.get(product.slug);
    if (!group) {
      result.push(product);
      continue;
    }

    const members = products.filter((candidate) => group.memberSlugs.includes(candidate.slug));
    if (members.length < 2) {
      result.push(product);
      continue;
    }

    result.push(mergeModelGroup(group, members));
    group.memberSlugs.forEach((slug) => groupedSlugs.add(slug));
  }

  return result;
}

function mergeModelGroup(group: CatalogModelGroup, products: Product[]): Product {
  const canonical = products.find((product) => product.slug === group.canonicalSlug) ?? products[0]!;
  const isSl69 = group.canonicalSlug === "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah";
  const isSl31 = group.canonicalSlug === "portativnaya-zaryadnaya-stantsiya-150-vt-48000-mah-2";
  const candidates = products.flatMap((product) => product.variants.map((variant) => ({
    ...variant,
    sourceSlug: variant.sourceSlug ?? product.slug,
    label: modelVariantLabel(product, variant),
    identity: modelVariantIdentity(product, variant),
  })));
  const unique = new Map<string, (typeof candidates)[number]>();

  for (const candidate of candidates) {
    const previous = unique.get(candidate.identity);
    if (!previous || isPreferredVariant(candidate, previous)) unique.set(candidate.identity, candidate);
  }

  const variants = (isSl69
    ? [150, 300, 500].flatMap((power) => {
      const candidate = candidates
        .filter((item) => item.label.startsWith(`${power} Вт`))
        .sort((left, right) => isPreferredVariant(left, right) ? -1 : isPreferredVariant(right, left) ? 1 : 0)[0];
      const level = power === 500 ? "L4" : power === 300 ? "L2" : "L1";
      return candidate ? [{ ...candidate, label: `${level} — ${power} Вт` }] : [];
    })
    : [...unique.values()])
    .sort((left, right) => compareVariantLabels(left.label, right.label))
    .map(({ identity: _identity, ...variant }) => variant);
  const articles = [...new Set(products.flatMap((product) => detailRows(product.characteristics)
    .filter(([label]) => label === "Артикул" || label === "Дополнительные артикулы")
    .flatMap(([, value]) => value.split(",").map((article) => article.trim()))))];

  const articlesLine = articles.length > 0 ? `Артикулы: ${articles.join(", ")}` : "";
  const sourceCharacteristics = products.map((product) => {
    const lines = product.characteristics
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("Артикул:") && !line.startsWith("Дополнительные артикулы:"));
    return `${product.sku}:\n${lines.join("\n")}`;
  });
  const sl69WatticoCharacteristics = [
    ...WATTICO_SHARED_SL69_CHARACTERISTICS.map(([label, value]) => `${label}: ${value}`),
    ...sourceCharacteristics,
  ].join("\n");
  const variantCharacteristics = Object.fromEntries(products.flatMap((product) => product.variants.map((variant) => [
    variant.sku,
    isSl69
      ? [
        ...WATTICO_SHARED_SL69_CHARACTERISTICS.map(([label, value]) => `${label}: ${value}`),
        product.characteristics,
      ].join("\n")
      : product.characteristics,
  ]))) as Record<string, string>;

  return {
    ...canonical,
    name: isSl69 ? "Портативная зарядная станция NS-69" : group.name,
    description: isSl69 ? sl69Description : group.description,
    packageContents: isSl69 ? sl69PackageContents : canonical.packageContents,
    image: isSl69 ? sl69Image : isSl31 ? sl31Image : canonical.image,
    price: Math.min(...variants.map((variant) => variant.price)),
    oldPrice: undefined,
    characteristics: isSl69
      ? [articlesLine, sl69WatticoCharacteristics || sl69Characteristics].filter(Boolean).join("\n")
      : [articlesLine, ...sourceCharacteristics].filter(Boolean).join("\n"),
    variantCharacteristics,
    variants,
  };
}

function modelVariantLabel(product: Product, variant: ProductVariant) {
  const text = `${product.name} ${product.characteristics}`;
  const specText = text.replace(/\b(?:SL|NS)-?\d+(?:-L\d+)?\b/gi, "");
  const power = readSpec(specText, /(\d[\d\s.,]*)\s*(?:W|Вт)(?!\w)/i)
    || (product.category === VOLTAGE_INVERTER_CATEGORY ? readSpec(product.name, /(\d[\d\s.,]*)$/) : "");
  const hybridPower = readSpec(specText, /(\d[\d\s.,]*)\s*(?:kW|кВт)(?!\w)/i);
  const capacity = readSpec(specText, /(\d[\d\s.,]*)\s*(?:mAh|мА(?:·)?ч|Ah|А(?:·)?ч)(?!\w)/i);
  const energy = readSpec(specText, /(\d[\d\s.,]*)\s*(?:Wh|Втч|Вт[·.]?ч)(?!\w)/i);
  const weight = readSpec(specText, /(\d[\d\s.,]*)\s*(?:kg|кг|g|г)(?!\w)/i);

  if (product.category === VOLTAGE_INVERTER_CATEGORY && power) return `${power} Вт`;
  if (product.category === "Гибридные инверторы" && hybridPower) return `${hybridPower} кВт`;
  if ((product.category === "AGM аккумуляторы" || product.category === LIFEPO4_CATEGORY) && capacity) return `${capacity} А·ч`;
  if (product.category === "Солнечные панели" && power) return `${power} Вт${weight ? ` · ${weight}` : ""}`;
  if (product.category === "POWERBANK" && capacity) return `${capacity} мАч`;
  if (product.category === "Портативные зарядные станции" && power) {
    return [
      `${power} Вт`,
      capacity ? `${capacity} мАч` : "",
      energy ? `${energy} Вт·ч` : "",
    ].filter(Boolean).join(" · ");
  }
  return variant.label;
}

function modelVariantIdentity(product: Product, variant: ProductVariant) {
  const label = modelVariantLabel(product, variant);
  const parts = label.split(" · ");
  if (product.category === VOLTAGE_INVERTER_CATEGORY || product.category === "Гибридные инверторы") return parts[0] ?? label;
  if (product.category === "AGM аккумуляторы" || product.category === LIFEPO4_CATEGORY || product.category === "POWERBANK") return parts[0] ?? label;
  if (product.category === "Портативные зарядные станции") return `${parts[0] ?? ""}|${parts[1] ?? ""}`;
  if (product.category === "Солнечные панели") return label;
  return label;
}

function readSpec(text: string, pattern: RegExp) {
  const value = text.match(pattern)?.[1];
  if (!value) return "";
  const compactValue = value.replace(/\s+/g, "");
  const compact = compactValue.includes(",")
    ? compactValue.replace(/\./g, "").replace(",", ".")
    : /\.\d{3}$/.test(compactValue) ? compactValue.replace(".", "") : compactValue;
  const number = Number(compact);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number)
    : value.trim().replace(/\s+/g, " ");
}

function isPreferredVariant(candidate: ProductVariant, previous: ProductVariant) {
  const availabilityRank = { unavailable: 0, preorder: 1, "in-stock": 2 };
  return availabilityRank[candidate.availability] > availabilityRank[previous.availability]
    || (candidate.availability === previous.availability && candidate.price < previous.price);
}

function compareVariantLabels(left: string, right: string) {
  const leftValues = left.split(" · ").map((part) => Number(part.match(/[\d\s,]+/)?.[0]?.replace(/\s/g, "").replace(",", ".")) || Number.POSITIVE_INFINITY);
  const rightValues = right.split(" · ").map((part) => Number(part.match(/[\d\s,]+/)?.[0]?.replace(/\s/g, "").replace(",", ".")) || Number.POSITIVE_INFINITY);
  for (let index = 0; index < Math.max(leftValues.length, rightValues.length); index += 1) {
    const comparison = (leftValues[index] ?? Number.POSITIVE_INFINITY) - (rightValues[index] ?? Number.POSITIVE_INFINITY);
    if (comparison !== 0) return comparison;
  }
  return left.localeCompare(right, "ru-RU");
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

export function shortDescription(product: Product) {
  return product.description.split(/\r?\n/).find(Boolean) ?? "Надёжное решение для автономного питания.";
}

export function detailLines(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function detailRows(value: string): Array<[string, string]> {
  const lines = detailLines(value).filter((line) => line !== "Добавить к сравнению");
  const rows: Array<[string, string]> = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const separator = line.indexOf(":");

    if (separator > 0) {
      rows.push([line.slice(0, separator).trim(), line.slice(separator + 1).trim()]);
      index += 1;
      continue;
    }

    rows.push([line, lines[index + 1] ?? ""]);
    index += 2;
  }

  return rows;
}

export function getSelectedVariant(product: Product, sku?: string) {
  return product.variants.find((variant) => variant.sku === sku) ?? product.variants[0];
}

export function isVariantAddable(variant: ProductVariant) {
  return variant.availability !== "unavailable";
}

export function productAvailability(product: Product): Availability {
  if (product.variants.some((variant) => variant.availability === "in-stock")) return "in-stock";
  if (product.variants.some((variant) => variant.availability === "preorder")) return "preorder";
  return "unavailable";
}

export function relatedProducts(product: Product, products: readonly Product[], limit = 4) {
  return products.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, limit);
}
