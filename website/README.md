# NIKASS storefront — Astro + React

Единый активный storefront: главная и визуальный язык Astra объединены с проверенной логикой вариантов, наличия, предзаказа, корзины и guest checkout. Каталог при сборке берётся из `GET /api/catalog` backend, а backend получает его из WooCommerce REST API. Из ответа выбирается набор моделей из CSV: 24 строки выгрузки соответствуют 21 уникальному товару WooCommerce.

Маршруты: `/`, `/catalog`, `/catalog/[slug]`, `/blog`, `/blog/[slug]`, `/cart`, `/checkout`, `/message-scroller`.

Публичный блог содержит короткие статьи NIKASS о сценариях автономной энергии; записи доступны из шапки сайта и карточек на главной.

`/message-scroller` отправляет историю текущей вкладки в `POST /api/chat`. Для локальной страницы задайте `PUBLIC_API_URL`, а в `backend/.env` включите `AI_PROVIDER=chat-completions` и укажите серверные `AI_API_URL` и `AI_API_KEY`; по умолчанию AI выключен. Вопросы о времени работы используют встроенный расчётчик; формула и правила базы знаний описаны в [../docs/CHAT_KNOWLEDGE.md](../docs/CHAT_KNOWLEDGE.md).

Из корня репозитория `bun run dev:storefront` запускает сайт и API вместе.

Перед сборкой запустите backend с `CATALOG_PROVIDER=woocommerce` и заполненными серверными `WOOCOMMERCE_*`. Адрес backend задаёт `PUBLIC_API_URL` (по умолчанию `http://localhost:3000`). Сборка падает, если API недоступен или вернул неверный каталог; изображения берутся из WooCommerce, а для товара без изображения используется общий fallback. Перед созданием заказа backend/WooCommerce всё равно повторно проверяет цену и остаток.

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
