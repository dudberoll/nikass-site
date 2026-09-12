export type CategorySlug =
  | 'charging-stations'
  | 'power-banks'
  | 'solar-panels'
  | 'inverters'
  | 'agm-batteries'

export type Availability = 'in-stock' | 'preorder' | 'unavailable'

export type Category = {
  slug: CategorySlug
  name: string
  description: string
  image: string
}

export type ProductVariant = {
  sku: string
  label: string
  price: number
  oldPrice?: number
  availability: Availability
}

export type ProductReview = {
  author: string
  rating: number
  text: string
}

export type Product = {
  source?: 'woocommerce'
  slug: string
  name: string
  category: CategorySlug
  images: string[]
  shortDescription: string
  description: string
  characteristics: Record<string, string>
  packageContents: string[]
  warrantyMonths: 12
  reviews: ProductReview[]
  relatedProductSlugs: string[]
  promotionPeriod?: string
  popularity: number
  createdAt: string
  variants: ProductVariant[]
}

export const CATEGORIES: Category[] = [
  {
    slug: 'charging-stations',
    name: 'Зарядные станции',
    description: 'Резервное питание дома, в дороге и на даче.',
    image: '/catalog/charging-station.svg',
  },
  {
    slug: 'power-banks',
    name: 'Power Bank',
    description: 'Запас энергии для техники в любом маршруте.',
    image: '/catalog/power-bank.svg',
  },
  {
    slug: 'solar-panels',
    name: 'Солнечные панели',
    description: 'Лёгкие решения для автономной зарядки.',
    image: '/catalog/solar-panel.svg',
  },
  {
    slug: 'inverters',
    name: 'Инверторы',
    description: 'Стабильное питание чувствительной электроники.',
    image: '/catalog/inverter.svg',
  },
  {
    slug: 'agm-batteries',
    name: 'AGM-аккумуляторы',
    description: 'Надёжный запас энергии для систем 12 и 24 В.',
    image: '/catalog/agm-battery.svg',
  },
]

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  'in-stock': 'В наличии',
  preorder: 'Предзаказ',
  unavailable: 'Недоступен',
}

export const MOCK_PRODUCTS: Product[] = [
  {
    slug: 'nikass-ns-31',
    name: 'NIKASS NS-31',
    category: 'charging-stations',
    images: ['/catalog/charging-station.svg'],
    shortDescription: 'Компактная станция для рабочих мест, поездок и дачи.',
    description: 'Тихая зарядная станция для ноутбука, света, роутера и небольшой бытовой техники.',
    characteristics: { Мощность: '300 Вт', Ёмкость: '288 Вт·ч', 'Выход AC': '230 В' },
    packageContents: ['Станция NIKASS NS-31', 'Сетевой кабель', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Алексей', rating: 5, text: 'Удобно брать с собой на дачу и в поездки.' }],
    relatedProductSlugs: ['nikass-solar-100', 'nikass-agm-100'],
    promotionPeriod: 'до 31 декабря 2026',
    popularity: 98,
    createdAt: '2026-02-12',
    variants: [
      { sku: 'NS31-300-288', label: '300 Вт / 288 Вт·ч', price: 24990, oldPrice: 29990, availability: 'in-stock' },
      { sku: 'NS31-600-576', label: '600 Вт / 576 Вт·ч', price: 45990, availability: 'preorder' },
    ],
  },
  {
    slug: 'nikass-ns-63',
    name: 'NIKASS NS-63',
    category: 'charging-stations',
    images: ['/catalog/charging-station.svg'],
    shortDescription: 'Универсальная станция для дома и длительных выездов.',
    description: 'Запас мощности для техники, освещения и зарядки нескольких устройств одновременно.',
    characteristics: { Мощность: '600 Вт', Ёмкость: '576 Вт·ч', 'Выход AC': '230 В' },
    packageContents: ['Станция NIKASS NS-63', 'Сетевой кабель', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Марина', rating: 5, text: 'Понятный экран и хватает на весь вечер.' }],
    relatedProductSlugs: ['nikass-ns-31', 'nikass-solar-200'],
    popularity: 91,
    createdAt: '2026-01-28',
    variants: [{ sku: 'NS63-600-576', label: '600 Вт / 576 Вт·ч', price: 49990, availability: 'in-stock' }],
  },
  {
    slug: 'nikass-power-20',
    name: 'NIKASS Power 20',
    category: 'power-banks',
    images: ['/catalog/power-bank.svg'],
    shortDescription: 'Тонкий Power Bank для телефона, планшета и наушников.',
    description: 'Повседневный внешний аккумулятор с быстрой зарядкой через USB-C.',
    characteristics: { Ёмкость: '20 000 мА·ч', 'Выход USB-C': '22,5 Вт', Порты: 'USB-C + USB-A' },
    packageContents: ['Power Bank', 'Кабель USB-C', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Илья', rating: 4, text: 'Хороший размер для ежедневного использования.' }],
    relatedProductSlugs: ['nikass-power-50', 'nikass-solar-100'],
    popularity: 89,
    createdAt: '2026-02-02',
    variants: [{ sku: 'P20-22-5', label: '20 000 мА·ч', price: 4990, availability: 'in-stock' }],
  },
  {
    slug: 'nikass-power-50',
    name: 'NIKASS Power 50',
    category: 'power-banks',
    images: ['/catalog/power-bank.svg'],
    shortDescription: 'Большой запас энергии для ноутбука и нескольких устройств.',
    description: 'Ёмкий внешний аккумулятор для долгих поездок и удалённой работы.',
    characteristics: { Ёмкость: '50 000 мА·ч', 'Выход USB-C': '65 Вт', Порты: '2 × USB-C + USB-A' },
    packageContents: ['Power Bank', 'Кабель USB-C', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Светлана', rating: 5, text: 'Беру в командировки — заряжает ноутбук и телефон.' }],
    relatedProductSlugs: ['nikass-power-20', 'nikass-ns-31'],
    popularity: 84,
    createdAt: '2026-03-01',
    variants: [{ sku: 'P50-65', label: '50 000 мА·ч', price: 8990, availability: 'preorder' }],
  },
  {
    slug: 'nikass-solar-100',
    name: 'NIKASS Solar 100',
    category: 'solar-panels',
    images: ['/catalog/solar-panel.svg'],
    shortDescription: 'Складная панель для зарядных станций и автономных поездок.',
    description: 'Монокристаллическая панель с удобной складной конструкцией для выездного использования.',
    characteristics: { Мощность: '100 Вт', Напряжение: '18 В', Тип: 'Монокристалл' },
    packageContents: ['Солнечная панель', 'Кабель MC4', 'Чехол'],
    warrantyMonths: 12,
    reviews: [{ author: 'Роман', rating: 5, text: 'Легко раскладывается и занимает мало места.' }],
    relatedProductSlugs: ['nikass-ns-31', 'nikass-solar-200'],
    popularity: 82,
    createdAt: '2026-01-18',
    variants: [{ sku: 'SOL100-MC4', label: '100 Вт', price: 12990, availability: 'in-stock' }],
  },
  {
    slug: 'nikass-solar-200',
    name: 'NIKASS Solar 200',
    category: 'solar-panels',
    images: ['/catalog/solar-panel.svg'],
    shortDescription: 'Панель увеличенной мощности для автономных систем.',
    description: 'Два независимых полотна помогают быстрее восполнять запас энергии в солнечный день.',
    characteristics: { Мощность: '200 Вт', Напряжение: '24 В', Тип: 'Монокристалл' },
    packageContents: ['Солнечная панель', 'Кабель MC4', 'Чехол'],
    warrantyMonths: 12,
    reviews: [{ author: 'Олег', rating: 4, text: 'Подходит для стационарного выездного комплекта.' }],
    relatedProductSlugs: ['nikass-solar-100', 'nikass-ns-63'],
    popularity: 73,
    createdAt: '2025-12-14',
    variants: [{ sku: 'SOL200-MC4', label: '200 Вт', price: 21990, availability: 'unavailable' }],
  },
  {
    slug: 'nikass-inverter-1600',
    name: 'NIKASS Inverter 1600',
    category: 'inverters',
    images: ['/catalog/inverter.svg'],
    shortDescription: 'Инвертор с чистой синусоидой для дома и автомобиля.',
    description: 'Преобразует напряжение аккумулятора в стабильное питание для чувствительной техники.',
    characteristics: { Мощность: '1600 Вт', 'Тип синуса': 'Чистая синусоида', Напряжение: '12 В' },
    packageContents: ['Инвертор', 'Кабели подключения', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Дмитрий', rating: 5, text: 'Работает тихо, ноутбук и насос запускаются без проблем.' }],
    relatedProductSlugs: ['nikass-agm-100', 'nikass-agm-200'],
    popularity: 79,
    createdAt: '2026-02-08',
    variants: [{ sku: 'INV1600-12', label: '1600 Вт / 12 В', price: 18990, availability: 'in-stock' }],
  },
  {
    slug: 'nikass-inverter-3000',
    name: 'NIKASS Inverter 3000',
    category: 'inverters',
    images: ['/catalog/inverter.svg'],
    shortDescription: 'Мощный инвертор для резервной системы дома.',
    description: 'Решение для постоянной нагрузки и техники с высокими пусковыми токами.',
    characteristics: { Мощность: '3000 Вт', 'Тип синуса': 'Чистая синусоида', Напряжение: '24 В' },
    packageContents: ['Инвертор', 'Кабели подключения', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Виктор', rating: 5, text: 'Собираю резервное питание для загородного дома.' }],
    relatedProductSlugs: ['nikass-agm-200', 'nikass-solar-200'],
    popularity: 68,
    createdAt: '2026-03-04',
    variants: [{ sku: 'INV3000-24', label: '3000 Вт / 24 В', price: 32990, availability: 'preorder' }],
  },
  {
    slug: 'nikass-agm-100',
    name: 'NIKASS AGM 100',
    category: 'agm-batteries',
    images: ['/catalog/agm-battery.svg'],
    shortDescription: 'Герметичный AGM-аккумулятор для резервного питания.',
    description: 'Стабильный аккумулятор для домашних систем, сигнализации и автономных комплектов.',
    characteristics: { Ёмкость: '100 А·ч', Напряжение: '12 В', Технология: 'AGM' },
    packageContents: ['Аккумулятор', 'Защитные колпачки', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Николай', rating: 5, text: 'Использую в связке с инвертором NIKASS.' }],
    relatedProductSlugs: ['nikass-inverter-1600', 'nikass-agm-200'],
    popularity: 76,
    createdAt: '2026-01-09',
    variants: [{ sku: 'AGM100-12', label: '100 А·ч / 12 В', price: 21990, availability: 'in-stock' }],
  },
  {
    slug: 'nikass-agm-200',
    name: 'NIKASS AGM 200',
    category: 'agm-batteries',
    images: ['/catalog/agm-battery.svg'],
    shortDescription: 'Ёмкий аккумулятор для длительной автономной работы.',
    description: 'Увеличенный запас энергии для систем резервного питания и загородного дома.',
    characteristics: { Ёмкость: '200 А·ч', Напряжение: '12 В', Технология: 'AGM' },
    packageContents: ['Аккумулятор', 'Защитные колпачки', 'Инструкция'],
    warrantyMonths: 12,
    reviews: [{ author: 'Елена', rating: 4, text: 'Нужен был большой запас — вариант подошёл.' }],
    relatedProductSlugs: ['nikass-inverter-3000', 'nikass-agm-100'],
    popularity: 61,
    createdAt: '2025-11-21',
    variants: [{ sku: 'AGM200-12', label: '200 А·ч / 12 В', price: 39990, availability: 'unavailable' }],
  },
]

// Public WooCommerce snapshot, product 798, read on 2026-09-10. Not automatic sync.
export const PRODUCTS: Product[] = [...MOCK_PRODUCTS, {
  source: 'woocommerce',
  slug: 'portativnaya-zaryadnaya-stantsiya-300w',
  name: 'Портативная зарядная станция 300W',
  category: 'charging-stations',
  images: [],
  shortDescription: 'Независимость везде. Ищете надёжный источник энергии для кемпинга, рыбалки или аварийного питания дома? Портативная электростанция NIKASS с ёмкостью 72 000 мАч 3.2V и мощностью 300 Вт — ваш идеальный спутник в любых условиях!',
  description: 'NIKASS Портативная зарядная станция 300W, 220V, 72000 мАч, 300 Вт, серый',
  characteristics: {},
  packageContents: [],
  warrantyMonths: 12,
  reviews: [],
  relatedProductSlugs: [],
  popularity: 0,
  createdAt: '2026-09-10T17:42:08.000Z',
  variants: [{ sku: 'TESTAGM10012', label: 'Основной вариант', price: 21975, availability: 'in-stock' }],
}]

const rubleFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number): string {
  return rubleFormatter.format(price)
}

export function getStartingPrice(product: Product): number {
  return product.variants[0]?.price ?? 0
}
