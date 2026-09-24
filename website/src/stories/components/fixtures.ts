import { HERO_CATEGORIES, type Product } from '../../data/catalog'

export const products: Product[] = [
  {
    slug: 'portable-power-station',
    sku: 'NKS-1200',
    name: 'Портативная зарядная станция 1200 Вт',
    category: 'Портативные зарядные станции',
    rawCategory: 'Портативные зарядные станции',
    price: 89900,
    description: 'Для резервного питания дома и поездок.',
    packageContents: 'Зарядная станция, кабель питания',
    characteristics: 'Мощность: 1200 Вт\nЁмкость: 1024 Вт·ч',
    image: '/assets/images/sl31-station.png',
    variants: [
      { sku: 'NKS-1200', label: '1200 Вт', price: 89900, availability: 'in-stock' },
      { sku: 'NKS-1200-PRO', label: '1200 Вт · комплект', price: 109900, availability: 'preorder' },
    ],
  },
]

export const categories = [HERO_CATEGORIES[1]]
