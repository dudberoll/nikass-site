# NIKASS storefront — Astro + React

Единый активный storefront: главная и визуальный язык Astra объединены с проверенной логикой вариантов, наличия, предзаказа, корзины и guest checkout. 24 товара и фотографии берутся из `src/data/nikass_catalog_ozon.csv` и `public/products/`.

Маршруты: `/`, `/catalog`, `/catalog/[slug]`, `/cart`, `/checkout`, `/message-scroller`.

`/message-scroller` отправляет историю текущей вкладки в `POST /api/chat`. Для локальной страницы задайте `PUBLIC_API_URL`, а в `backend/.env` включите `AI_PROVIDER=chat-completions` и укажите серверные `AI_API_URL` и `AI_API_KEY`; по умолчанию AI выключен.

Из корня репозитория `bun run dev:storefront` запускает сайт и API вместе.

Каталог понимает необязательную CSV-колонку `Наличие` со значениями `в наличии`, `предзаказ` и `нет в наличии`; при её отсутствии товар считается доступным. Перед созданием заказа backend/WooCommerce всё равно повторно проверяет цену и остаток.

Для checkout задайте `PUBLIC_API_URL`, `PUBLIC_PRIVACY_URL` и `PUBLIC_TERMS_URL`. Без двух юридических URL форма валидирует поля, но не отправляет персональные данные. Для автоподсказок адреса добавьте `PUBLIC_YANDEX_SUGGEST_API_KEY` — ключ Геосаджеста является публичным, поэтому ограничьте его разрешёнными доменами в кабинете Яндекса. Без ключа адрес можно заполнить вручную.

```bash
bun run --cwd website typecheck
bun run --cwd website test
bun run --cwd website build
bun run --cwd website test:build-contracts
bun run --cwd website e2e -- storefront.spec.ts
```

```bash
bun install
bun run dev
```
