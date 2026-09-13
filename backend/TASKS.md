# NIKASS backend — задачи

## Сделано

- [x] Публичный `GET /api/catalog` с поиском, категорией, диапазоном цены,
  сортировкой и пагинацией.
- [x] Публичный `GET /api/catalog/:slug` для карточки товара.
- [x] Единый DTO товара и варианта: SKU, цена, старая цена, доступность,
  характеристики, изображения и связанные поля.
- [x] Адаптер WooCommerce REST API через `fetch` и Basic Auth.
- [x] Загрузка вариантов WooCommerce для variable-product.
- [x] In-memory cache настраиваемый до 5 минут и stale-ответ при временной
  недоступности WooCommerce.
- [x] OpenAPI-описание маршрутов и unit-тесты без внешнего API и Docker.

## Перед подключением WooCommerce

- [x] Вставить значения в `backend/.env`: `CATALOG_PROVIDER=woocommerce`, URL
  `/wp-json/wc/v3/products`, `WOOCOMMERCE_CONSUMER_KEY` и
  `WOOCOMMERCE_CONSUMER_SECRET`.
- [ ] Проверить реальные поля категорий, атрибутов, изображений, акций и
  вариантов; при расхождении изменить только адаптер
  `src/modules/catalog/infrastructure/woocommerce-source.ts`.
- [x] Подключить website к этим read-only маршрутам после согласования DTO. Website получает build-time snapshot через
  `GET /api/catalog`; CSV больше не используется.

## Следующий срез

- [x] Контракт корзины и проверка свежей цены/статуса: `POST /api/catalog/cart/review`. Количественный остаток и резервирование проверяются при реализации заказа.
- [x] Гостевая форма, адрес, промокод и создание заказа через WooCommerce Store API.
- [x] Приватная попытка заказа и отдельные outbox-уведомления email/Telegram.
- [ ] Применить миграцию checkout_attempts и проверить PostgreSQL integration.
- [ ] Проверить настоящий WooCommerce, бесплатную доставку, offline gateway, промокоды и уведомления по docs/ORDERS.md.
- [ ] Заявки, блог и уведомления email/Telegram.

Если провайдер не настроен, backend намеренно отвечает `503` на catalog routes и
не подставляет fake-товары.
