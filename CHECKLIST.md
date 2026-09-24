# Install Checklist

This file is the intake record for this repository. The installing agent fills it in during first-run setup and keeps it current afterwards.

**For the agent:** ask the questions below in the user's language, in product terms, and write the answers into this file as you go. Do not start feature work until everything through _First-version capabilities_ and every conditional section activated by those answers is completed. Never ask the user anything under _Decided by the agent_ - make those calls yourself and explain them in product terms.

**For the product owner:** this is the record of what was decided about your project. If something here is wrong, say so - the agent treats this file as the source of truth for what your product needs.

Answer cells hold `_unanswered_` until the question is asked, and `n/a` when the question cannot apply to this project. Answers are written in the product owner's language, but the section headings and the capability-ledger state words stay in English: other documents refer to them by those exact names. Keep every section heading, even when its rows are all `n/a`.

**When working on the template itself** (not installing it for a project), there is nothing to record: leave every answer cell at `_unanswered_` and every checkbox unchecked - those would otherwise ship to each future install. The capability ledger is the exception: it always describes the current branch, so keep it current when template work adds or removes a capability.

**Install status:** `in progress`
<!-- Set to: not started | in progress | completed YYYY-MM-DD -->

---

## 1. Project identity

| Question                                                        | Answer       |
| --------------------------------------------------------------- | ------------ |
| New project from this template, or work on the template itself? | Новый проект на основе шаблона; не работа над шаблоном. |
| Project name / slug                                             | _unanswered_ |
| Your own GitHub repository URL, if you have one                 | https://github.com/dudberoll/nikass-site.git |

If no GitHub destination is chosen, the repository is left without `origin` and publishing stays unconfigured. The template remote is detached during setup unless this checkout is explicitly for improving the template.

## 2. Product

| Question                                                  | Answer       |
| --------------------------------------------------------- | ------------ |
| What product do you want to build first?                  | Публичный storefront NIKASS на Astro + React с каталогом WooCommerce, корзиной, гостевым заказом и тестовой hosted-оплатой YooKassa. |
| What is the first user journey that must work end to end? | Главная → каталог NIKASS → карточка товара → корзина → двухшаговое оформление → проверка цены и наличия в backend → hosted-тест YooKassa → подтверждение результата на checkout. Рабочий WooCommerce order подключается отдельным production-шагом. AI-консультант остаётся отдельной опцией. |

## 3. Active surfaces

Mark what is active now, and set the install status to `in progress` as soon as this section is answered. From then on, everything unmarked is deferred and must be left alone: no features, no setup, no test flows. While the status is still `not started` nothing has been decided yet, so unmarked boxes mean "not asked", not "forbidden".

- [x] `backend` - API, database, auth
- [ ] `webapp` - browser screens behind sign-in (no SEO)
- [x] `website` - public pages that must rank in search or preview when shared
- [ ] `mobile` - Expo app (lives on the `mobile` branch; switch branches before setup)

| Question                                                                                                             | Answer       |
| -------------------------------------------------------------------------------------------------------------------- | ------------ |
| Why the unmarked surfaces are deferred, if it needs explaining                                                       | Активны публичный website и backend/API для каталога, guest checkout и AI-консультанта. Webapp и мобильное приложение отложены; старые Apple-маршруты не входят в текущую витрину. |
| If `mobile` is active: are Expo/EAS builds, Expo Push, and Maestro E2E needed now, or left unconfigured until later? | n/a |

The split between `webapp` and `website` is the agent's call, not the user's; `README.md` explains how to route a feature between them.

## 4. First-version capabilities

Ask about product needs, not implementations. Mark what the first version actually needs, then fill the row below even when nothing was ticked, so a later session can tell "asked, and the answer was no" from "not asked yet".

- [ ] Accounts / sign-in
- [ ] Saved data that survives a restart
- [ ] File, image, or media uploads → also answer _Files, images, and media_
- [x] Paid subscriptions or one-off payments → also answer _Payments_
- [ ] Admin tools or roles
- [x] External integrations (which: WooCommerce, Yandex Geosuggest, optional AI provider through a server-side chat-completions API)
- [ ] Real-time chat, presence, collaboration, or live updates

| Question                                                                                          | Answer       |
| ------------------------------------------------------------------------------------------------- | ------------ |
| What the first version explicitly should NOT do (write "nothing ruled out" if that is the answer) | Личный кабинет, подписки, загрузка пользовательских файлов, RAG, хранение истории и операторский чат не входят в текущую версию; production-активация оплаты будет отдельным шагом. |

## 5. Files, images, and media

This project ships private file storage with user avatars, so answer these for the files your product adds on top; otherwise mark the rows `n/a`. Keep the section either way - `docs/STORAGE.md` sends the agent here when uploads are added later.

| Question                                                                                      | Answer       |
| --------------------------------------------------------------------------------------------- | ------------ |
| What do users upload?                                                                         | n/a |
| Public, private, shared with selected people, or mixed?                                       | n/a |
| Who can upload, view, replace, and delete?                                                    | n/a |
| Maximum file size and allowed file types                                                      | n/a |
| Do images need thumbnails, resizing, format conversion, compression, cropping, or moderation? | n/a |
| How long do files live after the owning record is deleted?                                    | n/a |
| Should filenames be visible to users, or opaque?                                              | n/a |

## 6. Website data and freshness

Answer these when `website` is active; otherwise mark the rows `n/a`. Keep product choices here and
follow the implementation contract in `docs/WEB_SURFACES.md`.

| Question                                                                                    | Answer       |
| ------------------------------------------------------------------------------------------- | ------------ |
| Which public product or content data comes from the backend/database at website build time? | Каталог NIKASS загружается из WooCommerce API при статической сборке website и ограничивается 47 товарными строками текущего CSV; старые и тестовые товары WooCommerce исключаются. |
| How soon after that data changes must the public website show the change?                   | После следующей ручной статической сборки; автоматическая синхронизация пока не включена. |
| Which changes require an automatic rebuild/redeploy rather than a manual release?           | Никакие в текущем локальном этапе; публикация и автоматический rebuild не запрошены. |

The default is Astro SSG. Database-backed public data is fetched while building static output. If
published database changes must appear automatically, implement the documented `website:rebuild`
outbox path. SSR or request-time rendering is an exception recorded here only when the required
freshness or personalization cannot be met by rebuild/redeploy.

## 7. Payments

Answer these only when payments are active above; otherwise mark the rows `n/a`. Keep the section either way, and replace the `n/a` answers if payments are added later.

| Question                                                                                                                    | Answer       |
| --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| What exactly do users pay for?                                                                                              | Разовые покупки товаров NIKASS; сейчас включён только тестовый hosted-платёж YooKassa. |
| Recurring subscription, one-off purchase, or both?                                                                          | Только разовая покупка. |
| Does the public website need a local cart or offer selection before registration/sign-in?                                   | n/a for payments: website всё равно хранит локальную корзину до гостевого checkout. |
| Which active surfaces need payment: browser checkout, App Store / Google Play, native card entry, Apple Pay, or Google Pay? | Browser checkout на `website`; оплата проходит на hosted-странице YooKassa. |
| What stops working when someone does not pay?                                                                               | Страница не показывает успешное оформление и fulfillment не запускается. |

Whatever this project ends up with, the ledger below is what states it. Read `docs/WEB_SURFACES.md`
before implementing any payment surface. Browser checkout is built in authenticated `webapp` plus
the backend; `website` may pass a local cart but never owns a second payment flow. The `mobile`
template line ships App Store and Google Play subscriptions as working code that is switched off,
and may independently add policy-compliant card, Apple Pay, or Google Pay flows when the product
needs them. Declining a shipped payment capability means deleting its code during setup and
recording it as `removed`. Payments are never half-present and are never reintroduced on a guess.

## 8. Deployment

| Question                                                                                     | Answer       |
| -------------------------------------------------------------------------------------------- | ------------ |
| Is deployment needed now, or local-only for the moment?                                      | Только локальный запуск; публикация не запрошена. |
| Where are your users, and must the data stay in Russia?                                      | _unanswered_ |
| Hosting, picked by the agent from the answer above: DigitalOcean / Yandex Cloud / own server | _unanswered_ |
| Production domains / URLs for API, webapp, and website; is Yandex CDN needed now?            | _unanswered_ |
| Which surfaces are released first                                                            | _unanswered_ |

**Ask the audience question, not the provider question.** A product owner knows where their users
are and whether data must stay in Russia; they should not be asked to compare clouds. The agent
picks the hosting from that answer:

| Hosting      | Chosen when                                                                        | What the template gives you                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DigitalOcean | Default for an audience outside Russia.                                            | Terraform creates App Platform API/static sites, a scheduler worker, migration gate, Managed PostgreSQL, DOCR, private media Spaces, and remote state. Release everything with `bun run release -- digitalocean`. |
| Yandex Cloud | Users in Russia, or data must stay there.                                          | Terraform creates Serverless Containers/timers, Managed PostgreSQL, API Gateway, static and private media Object Storage, remote state, and opt-in CDN. Release everything with `bun run release -- yandex`.      |
| Own server   | Full control wanted, no vendor lock-in, and someone is willing to run the machine. | The same Docker image plus the in-repo scheduler, with a short runbook in the "Own Server" section of `docs/DEPLOYMENT.md`. No release script: you own TLS, backups, updates, and monitoring.                     |

Pick exactly one and record it above. In an installed project, delete the unused provider directory
under `infra/` and its provider runbook rather than keeping a second possible production state.
Keep `scripts/infra.mjs` and `docs/DEPLOYMENT.md`: they own the shared safety/release contract. An
own-server project deletes both provider directories and runbooks. Local development never requires
cloud credentials regardless of the choice.

Deployment is often deferred at install time, which leaves these rows `_unanswered_`. When the user later asks to deploy, ask the unanswered questions then and write the answers back here before following `docs/DEPLOYMENT.md`.

## 9. Decided by the agent - do not ask the user

The user is a product owner, not an engineer. These are engineering decisions the agent owns, makes, and explains only in product terms:

- Which browser surface a feature belongs to (`website` for SEO/public, `webapp` for behind-login).
- Which email provider the recorded hosting implies: Yandex Cloud means Postbox, anything else means Resend. Ask where the users are, not which mail service the owner prefers.
- SSG plus build-time backend data and rebuild/redeploy for public product information unless a recorded freshness or personalization need requires runtime rendering.
- One browser checkout in authenticated `webapp`; `website` may hand off a local cart but never owns payment. Mobile payment UI stays native and separate.
- Monolithic backend; no microservices during setup.
- Docker Compose for local PostgreSQL on every OS; never a native install unless the user insists.
- Astro for `website`; Next.js only if Vercel-style ISR is a stated product requirement.
- The selected Terraform launch profile, machine sizes, serverless/static shape, and when an HA or CDN upgrade is justified.
- Which hosting the recorded audience implies: Russia means Yandex Cloud, elsewhere means DigitalOcean, and an explicit wish for full control means an own server. Explain the pick in product terms; never ask the owner to compare providers.
- Managed Redis-compatible Pub/Sub only when real-time needs to scale across instances.
- Test boundaries follow the failure mechanism: unit for pure/client rules, contracts for shared wire shapes, backend integration for route/auth/database behavior, and a curated browser portfolio for product-critical client-to-API journeys and real-browser risks.
- Libraries, file layout, naming, refactors, and validation scope.

## 10. Capability ledger

What this project actually contains. The agent updates it whenever a capability is added or removed. Every row carries exactly one state:

- `included` - present and expected to work.
- `available` - partly there but not usable yet; the note says exactly what is still missing, which may be configuration, routes, or UI.
- `absent` - not part of this project. Build it only after the product owner asks.
- `removed` - deliberately deleted during setup. **Do not re-add it.** A leftover reference, migration, or doc mention is not a product requirement; ask the product owner first.

A capability with no row is `absent` by default. Add the row instead of assuming. The State column always holds one of the four states above - never `_unanswered_` or `n/a`.

| Capability                      | State    | Note                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (email + password)         | included | Template baseline.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Admin roles                     | included | Roles and seeding in `backend`; admin UI in `webapp`.                                                                                                                                                                                                                                                                                                                                                                |
| Password reset email delivery   | included | Two providers behind one port, Yandex Cloud Postbox and Resend, selected by `EMAIL_DELIVERY`. The schema fallback is `disabled`, so an unset deployment sends and queues nothing; the copied local `backend/.env.example` intentionally selects `console` so reset links print locally. Delivery is durable: a request queues a `task_outbox` row and the shipped scheduler drains it every minute. Production needs an account with a provider and a deployed runner. See `docs/EMAIL.md`. |
| File/media storage              | included | Private uploads end to end, with user avatars as the worked example. Stores on local disk by default and on any S3-compatible bucket via `PRIVATE_STORAGE_*`, with no code change between them. See `docs/STORAGE.md`.                                                                                                                                                                                               |
| Infrastructure as code          | included | Provider-specific Terraform bootstrap, foundation, migration/runtime, and static roots cover DigitalOcean and Yandex Cloud, with remote state, guarded plan/apply, migration-gated immutable releases, media storage, static hosting, and jobs. `scripts/infra.mjs` is the one operations entry point. See `infra/README.md` and `docs/DEPLOYMENT.md`.                                                               |
| Static asset precompression     | included | `bun run static:precompress` writes `.br` and `.gz` next to the text assets in `webapp/dist` and `website/dist`, using `node:zlib` and no dependency. It is own-server tooling: hosted releases do not upload those sidecars and use their edge/runtime compression when available.                                                                                                                                  |
| Storybook component catalogs    | included | Separate local React/Vite catalogs cover every flat shared `webapp/src/components` module and every website-owned React component in `website/src/components`, with official docs/a11y addons and story-only composition examples. They are not deployed; Astro-rendered sections remain outside React Storybook, and the website stays static SSG.                                                                                                                                       |
| Apple storefront prototype | removed | Старые Apple Store/Shop Mac маршруты удалены из активной website-поверхности; NIKASS использует собственные публичные маршруты. |
| NIKASS storefront catalog | included | `/`, `/catalog`, `/catalog/[slug]`, `/cart` и `/checkout` образуют путь на данных WooCommerce API, ограниченных выбранными артикулами CSV. Корзина хранит только slug/SKU/quantity в версионированном `sessionStorage`; checkout передаёт оплату на hosted YooKassa. |
| Локальный редактор каталога | included | `/catalog-editor` сохраняет описания карточек и характеристики в браузере локальной копии; архив статического сайта запускается без backend/WooCommerce, правки можно экспортировать и импортировать JSON-файлом. Цены, наличие и WooCommerce не меняются. |
| NIKASS backend catalog and cart review | included | WooCommerce catalog API and fresh cart review; provider credentials pending. Orders are a separately configured module. |
| AI-консультант | available | `/message-scroller` вызывает `POST /api/chat`; провайдер chat-completions подключается через серверные `AI_*`. По умолчанию отключён, история не хранится. |
| Website build-time backend data | included | Astro загружает каталог из WooCommerce API во время сборки; при ошибке сборка останавливается, а dev-запрос может повториться после запуска API. |
| Automatic SSG rebuild           | absent   | Durable desired/published revision state, single-flight deployment reconciliation, immutable atomic/blue-green release promotion, public-marker verification, and a provider adapter are not implemented. Yandex additionally needs a separate builder/upload component. See `docs/WEB_SURFACES.md`.                                                                                                                 |
| Website cart handoff | included | Корзина `website` хранит только slug/SKU/quantity в версионном sessionStorage и открывает единый same-origin `/checkout`; цену и остаток повторно проверяет backend. |
| Browser checkout / payments | available | Единый активный гостевой checkout находится в `website`: двухшаговая форма собирает данные, сервер считает итог, YooKassa возвращает hosted-ссылку и после возврата backend сверяет платёж. Локальный `YOO_KASSA_FULFILLMENT_MODE=disabled` не создаёт рабочий WooCommerce order; для production нужны миграция, HTTPS webhook и отдельная активация fulfillment. |
| Push notifications              | absent   | No push code here. Expo Push comes from the mobile template line.                                                                                                                                                                                                                                                                                                                                                    |
| Social sign-in (Apple / Google) | absent   | No social auth here. It comes from the mobile template line.                                                                                                                                                                                                                                                                                                                                                         |
| Real-time / WebSockets          | absent   | Requires an explicit product need.                                                                                                                                                                                                                                                                                                                                                                                   |
| Shared rate-limit state         | absent   | The auth and admin limiters count in process memory (`backend/src/http/security.ts`). DigitalOcean runs a single API instance, so the budgets are global there; Yandex Serverless Containers scale out per concurrent request, so on that hosting they are per instance. Moving the counter into the PostgreSQL this repository already runs is the recorded next step if Yandex hosting is chosen. See `docs/DEPLOYMENT.md`. |
| Background jobs                 | included | Jobs live in `backend/src/jobs.ts`. The shared scheduler runs `outbox:drain` every minute, upload cleanup hourly at minute 15, and auth cleanup daily at 03:00 UTC. Terraform deploys that scheduler as a DigitalOcean worker and the same executor in Yandex HTTP job containers/timer triggers; own servers run it under a supervisor. `workerLoops` stays empty. See `docs/BACKGROUND_JOBS.md`.                              |
| Durable task outbox             | included | `task_outbox` in PostgreSQL with handlers in `backend/src/outbox/handlers.ts`, drained by `outbox:drain`. Ships with the password-reset emails as its only producers, and stays empty until something enqueues. Adding a task type is a code change, never a migration.                                                                                                                                              |

## 11. Environment checks

2026-09-10: API WooCommerce проверен на чтение (41 товар). В локальную витрину
добавлен публичный снимок товара 798, SKU TESTAGM10012; это ручной импорт одного
товара, без автоматического обновления. Создание заказов выключено.

Verified by the agent during setup, not asked.

- [ ] `docker compose version` and `docker info` succeed (needed for PostgreSQL-backed backend flows, uploads, or DB-backed validation; not for read-only WooCommerce catalog access)
- [x] `git remote -v` inspected; template remote detached unless contributing to the template
- [ ] App-local `.env` files created from `.env.example`, with a locally generated `JWT_SECRET` (never committed)
- [x] Smallest meaningful validation run for the active surfaces

## 12. After setup

- [ ] Durable answers above filled in, install status set to `completed YYYY-MM-DD`
- [x] Validation scope recorded for this project: active NIKASS website changes run
  `bun run typecheck:website`, `bun run test:website`, `bun run build:website`,
  `bun run --cwd website test:build-contracts` and `bun run architecture:check`.
- [ ] Project renamed from the template identifiers (`web_app_demo`, `web-app-demo`, `vibecoding-template`, the `Vibe Coding Template` page title), `bun.lock` regenerated
- [ ] Deferred-surface notes added to the READMEs of surfaces that are not active
- [ ] `Bootstrap-Only Instructions` block deleted from `AGENTS.md`
- [ ] Local URLs, commands run, and anything the user must authorize manually reported back to the user

`README.md`, `AGENTS.md`, and some `docs/` runbooks route agents into this file by section name, so renaming a heading breaks those pointers silently. Add rows and sections a project needs, and cross-reference sections by name rather than by number so renumbering stays harmless.

### Setup progress — 2026-09-07

Исходники стандартной ветки master перенесены в существующий проект без git-истории шаблона; origin отсутствует. Временная копия удалена. README.md, CHECKLIST.md и AGENTS.md прочитаны. Название/slug и общая bootstrap-настройка всё ещё не подтверждены пользователем; этот снимок описывает начальное состояние до установки зависимостей. Для текущего локального этапа backend, Docker, облачные аккаунты и домены не нужны.

### Migration scope — 2026-09-07

Пользователь запросил перенос существующего сайта в стиле Apple из папки шаблона клонирования на стек этого проекта. Пользователь явно исключил MA AND MI: этот сайт не переносим. Активен website; публикация, настоящие оплаты, личный кабинет, админка, загрузка файлов и мобильное приложение не входят в текущий перенос. Исходные папки не изменяем.

Источник: `/Users/dudberoll/Downloads/ai-website-cloner-template` (Apple UK Store и Shop Mac). Перенесены статический контент, навигация, адаптивная вёрстка и карусели в Astro SSG + React. Маршруты: `/`, `/uk/store`, `/uk/shop/buy-mac`. Источник не изменён. Оплаты и аккаунты отложены.

Зависимости установлены через `bun install --frozen-lockfile` имеющимся Bun 1.3.14 без изменения lockfile; переход на указанный шаблоном Bun 1.4.0 остаётся частью незавершённой общей настройки. Перенос сайта проверен: `typecheck:website` (0 ошибок, подсказка deprecated verticalAlign в исходной библиотеке chart), `build:website` (3 страницы), `architecture:check`, `test:website` (7 тестов), `website test:build-contracts` (1 тест). В браузере на 1280 px и 390 px проверены меню/Escape, Store → Mac, мобильный возврат Mac → Store и прокрутка каруселей. На 390 px нет переполнения страницы и битых изображений. Локальный адрес: http://127.0.0.1:4322. Облачные аккаунты и домены не требуются.

### NIKASS catalog stage — 2026-09-08

Текущий этап добавляет локальную mock-модель NIKASS, переиспользуемые шапку и footer, полноценную mock-страницу товара и локальную корзину на маршрутах `/`, `/catalog`, `/catalog/[slug]` и `/cart`. Главная содержит только товарные блоки и ссылки каталога; форма заявки удалена из товарного пути. Поиск, выбор категории, стартовой цены и характеристик и сортировка работают поверх первоначального SEO-HTML; связанные товары ограничены категорией исходного товара. Корзина использует только `sessionStorage`, показывает ошибку недоступного storage и не перезаписывает полный cart между вкладками; backend/API, checkout и оплата не подключались. Проверки этапа после ревью: website typecheck — 0 ошибок и 1 внешний hint о deprecated `verticalAlign`, website tests — 25 pass, build — 15 страниц, build-contracts — 6 pass, architecture — passed, template-check — passed. Старые `/uk/*` Apple-маршруты не изменялись. Ручной browser-pass частичный: SSR/статический DOM проверены, но hydration и интерактивный keyboard/add/retry flow не подтверждены из-за ограничений локальной среды.

### NIKASS catalog acceptance — 2026-09-08

Каталог теперь показывает первые 6 из 10 товаров в HTML, постепенно раскрывает оставшиеся карточки через IntersectionObserver и кнопку, а также публикует доступную статическую страницу `/catalog/page/2`. Выполнен полный browser-pass на desktop 1280 px и mobile 390 px: пять категорий, варианты NS-31/NS-63, предзаказ NS-31, недоступный Solar200, пагинация, корзина и сохранение корзины после обновления. `bun run --cwd website e2e` — 14/14 сценариев; горизонтального переполнения нет.

### NIKASS backend stage — 2026-09-08

Пользователь активировал backend-этап до предоставления доступа к API. Реальные интеграции проверяются локальными тестовыми ответами; production не подставляет mock-товары. Реализованы каталог и проверка корзины по свежим данным WooCommerce. Создание заказа, checkout и внешние уведомления остаются следующим срезом.

### NIKASS orders stage — 2026-09-08

Пользователь явно выбрал заказ без регистрации. Единственная форма `/checkout`
находится в webapp; website только передаёт корзину. Доставка СДЭК бесплатна,
отправление оформляет менеджер, онлайн-оплаты нет. Проверяются имя и фамилия,
российский телефон, email, регион, город, улица, дом, необязательная квартира, индекс,
комментарий и согласие. Промокоды и остатки проверяет WooCommerce Store API.
Заказы остаются в WooCommerce; PostgreSQL хранит приватную попытку оформления
для защиты от повторной отправки и очереди уведомлений email/Telegram.
Настоящий магазин и документы ещё не подключены. Проверка адреса проверяет
формат и обязательность, не существование дома в адресном справочнике.
Checkout расширен до трёх шагов: личные данные, способ получения и адрес. На шаге способа
получения доступны доставка СДЭК и самовывоз; адрес и график самовывоза пока являются макетными
данными (Москва, ул. Лесная, 3; Пн–Пт, 09:00–18:00) и должны быть заменены перед публикацией.

### NIKASS storefront consolidation — 2026-09-11

Astra-версия стала единым `website`: сохранены её главная и визуальный язык, а каталог переключён на build-time snapshot из WooCommerce. 24 строки CSV сопоставляются с 21 уникальным товаром WooCommerce; в публичном каталоге совпадающие семейства отображаются как 9 карточек с вариантами мощности и ёмкости. Варианты, наличие, цены и связанные товары приходят из backend, а перед заказом авторитетен свежий WooCommerce review.

### NIKASS full CSV catalog stage — 2026-09-20

Публичная витрина переведена на 47 товарных строк текущего CSV вместо старой выборки. WooCommerce остаётся источником названий, цен, наличия и изображений; опубликованные старые и тестовые позиции, которых нет в CSV, не показываются. Серии SL-93, SL-69, SL-63, SL-31, инверторы, панели, AGM, LiFePO4 и Power Bank объединяются в 17 логических карточек с вариантами. Главная, связанные товары, бот-рекомендации и статья о даче используют новые внутренние карточки; характеристики по-прежнему приходят только из WooCommerce и могут быть дополнены позже.

### NIKASS YooKassa test-payment stage — 2026-09-17

В гостевом checkout добавлен разовый hosted-платёж через тестовый магазин YooKassa. Backend
создаёт платёж только из сохранённого server-side quote, проверяет сумму/RUB/test-mode/metadata
через API YooKassa после возврата и через webhook, а fulfillment идёт через durable outbox.
Локальная конфигурация намеренно оставляет `YOO_KASSA_FULFILLMENT_MODE=disabled`: успешная
тестовая оплата отображается на сайте, но реальный WooCommerce order не создаётся. Prisma migration
и полный browser-pass требуют запущенного Docker PostgreSQL; внешний webhook дополнительно требует
публичного HTTPS URL.
