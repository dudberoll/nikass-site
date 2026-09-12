# Website

Локальная проверка 2026-09-10: к десяти mock-моделям добавлен публичный снимок
WooCommerce-товара 798 (`TESTAGM10012`) на `/catalog/portativnaya-zaryadnaya-stantsiya-300w`.
Цена и доступность прочитаны через API; автоматической синхронизации пока нет.
Фото, атрибуты и комплектация этого товара в API отсутствуют.

## Текущий сайт

Перенесены страницы Apple UK из `/Users/dudberoll/Downloads/ai-website-cloner-template`:
`/uk/store` показывает Store, `/uk/shop/buy-mac` — Shop Mac. Главная `/` и новый
`/catalog` относятся к текущей NIKASS-витрине.
Astro генерирует готовый HTML; React сохраняет интерактивное меню и карусели.
Компоненты находятся в `src/components/apple`, стили — в `src/styles/apple.css`.
Все 20 используемых изображений лежат локально в `public/sites`.

Текущий продуктовый этап также содержит локальную NIKASS mock-витрину на `/` и
`/catalog`: пять категорий, десять демонстрационных моделей, варианты SKU, цены,
доступность и локальные SVG-заглушки. Каталог отдаёт первые шесть карточек в HTML,
остальные постепенно подгружает при прокрутке или по кнопке; доступны и статические
HTML-страницы `/catalog/page/2` с доступной пагинацией. Переиспользуемые шапка и
footer ведут на `/`, `/catalog` и `/cart`; ссылки карточек открывают `/catalog/[slug]`.
Страница товара
содержит SEO-HTML, выбор варианта и кнопку добавления. `/cart` хранит только slug,
SKU и количество в версионированном `sessionStorage`, а цену, название, изображение
и статус берёт из текущих `PRODUCTS`. Поиск, фильтры и сортировка работают поверх
SEO-HTML; фильтр цены использует стартовую цену, показанную в карточке, а блок
связанных товаров ограничен текущей категорией. Ошибка доступа к storage показывается
отдельным состоянием с повтором. `sessionStorage` остаётся вкладочным: native events
обновляют счётчик и компоненты текущей вкладки, но полный cart между вкладками не
перезаписывается.

Реальный checkout, оплата, backend/API, чат и отправка заказа не реализованы.
Следующий шаг оформления намеренно отключён. Backend и облачные аккаунты для этого
локального макета не нужны. Исходная папка не изменена.

Запуск из корня: `bun run dev:website -- --host 127.0.0.1 --port 4322`.
Проверки: `bun run typecheck:website`, `bun run test:website`,
`bun run build:website`, `bun run --cwd website test:build-contracts` и
`bun run architecture:check`.
Последняя команда проверяет готовый HTML, маршруты, подключение интерактивности
и наличие локальных изображений; сначала выполните сборку.

The website workspace is a separate Astro project for public, SEO-facing surfaces: landing pages, marketing/content sites, and the public catalog of product sites such as a marketplace. It is the SSG-first counterpart to the CSR `webapp` (which lives behind auth and needs no SEO). Read the mandatory cross-surface contract in [../docs/WEB_SURFACES.md](../docs/WEB_SURFACES.md) before adding backend-built product data, a cart, checkout, orders, subscriptions, entitlements, or payments.

## Stack

- Astro (static SSG by default; SSR-ready per route)
- Tailwind CSS 4 through the official Vite plugin
- shadcn/ui registry rendered through React on the server by default
- React Three Fiber for the isolated, decorative hero visual
- TypeScript
- Vite through Astro

The original template landing sections and 3D hero remain unused under `src/components/landing`.
The shadcn registry in `src/components/ui` remains available. Neither is imported by the current
Apple pages. Their product content is included in the static HTML before React hydrates.

## Rendering model

Astro prerenders every page to static HTML by default, so the standard build is a cheap static site in `website/dist`, deployable to a Static Site host or object storage + CDN. No server adapter is installed by default, on purpose: the common case (landing and content pages, plus stable public marketplace pages) is pure static.

Database-backed public product information may be fetched from the backend during `astro build`,
validated with a shared contract, and emitted as static HTML. Only public-safe data belongs in the
artifact, and required snapshot failures fail the build instead of publishing an empty catalog.
When a database change must update this output automatically, the owning write flow enqueues the
documented `website:rebuild` task; the commented handler is not a working rebuild feature by itself.

A route can opt into server rendering (SSR) with `export const prerender = false`. SSR is a deliberate upgrade, not the marketplace default, because it requires installing a Node adapter and deploying as a runtime service instead of a Static Site. Keep marketing/content pages and durable public catalog pages static. Render only request-specific routes on demand: live search, personalized public views, or inventory/price pages where stale HTML is unacceptable.

Use this freshness ladder before making an entire page uncached or personalized SSR:

1. SSG plus rebuild/redeploy for durable marketplace changes such as edited listings, category copy, and landing content.
2. Cached on-demand/SSR routes with CDN headers such as `stale-while-revalidate` when freshness matters more than a full redeploy cycle.
3. Astro server islands for non-SEO-critical dynamic or personalized fragments, such as a signed-in header state or saved/listing action.
4. Uncached or personalized Astro SSR only for request-specific pages where initial HTML must reflect current request data.

On-demand/SSR routes and server islands both require an Astro adapter and a runtime-capable deployment. They do not work from a pure Static Site host or object-storage static website. Server islands keep the main page prerendered while rendering only a fragment on demand; they are a smaller runtime step than making the whole route SSR, not a feature of static hosting. When server islands appear on cached pages or during rolling deploys, generate a stable key with `astro create-key` and configure `ASTRO_KEY` as a secret in both build and runtime environments so old cached HTML and the current server bundle can decrypt island props consistently. Never commit it, print it, expose it as `PUBLIC_*`, or bake it into static output.

Only anonymous, public-equivalent HTML may use shared CDN caching such as `public`, `s-maxage`, or `stale-while-revalidate`. Auth-dependent or personalized routes and server islands must use `private` or `no-store`, or a deliberately supported `Vary: Cookie`/`Authorization` strategy. `ASTRO_KEY` protects island prop encryption and deploy consistency; it is not a cache privacy boundary.

SEO-critical content must be present in the initial HTML: title, description, canonical URL, Open Graph/Twitter tags, product or category names, indexable descriptions, and public prices when they matter for search snippets. Client islands and server islands may enhance the page, but they must not be the only source of SEO-critical content.

## Commands

From the repository root:

```bash
bun run dev:website
bun run typecheck:website
bun run build:website
bun run test:website
```

From `website`:

```bash
bun run dev
bun run typecheck
bun run build
bun run test
bun run e2e -- cart.spec.ts
bun run preview
bun run storybook
bun run storybook:build
```

Astro publishes pages from `src/pages`. Static assets live in `public`.

Storybook runs locally on port `6007` in the website's dark monochrome theme. It catalogs every
React module in `src/components/ui` and non-production CTA, card-grid, FAQ/form, and content-block
compositions. The current Astro landing sections and pages stay outside the catalog: Storybook uses
the official React/Vite renderer only, adds no Astro adapter or hydration to the site, and its
static output is not part of `website/dist`.

## Env

The variables below are public, build-time configuration: Astro inlines `PUBLIC_*` values into the static output, so nothing secret may carry that prefix (the server-island `ASTRO_KEY` above stays a secret and never does). The local `.env.example` lists them; copy it to `website/.env` when a local build should carry these values, and leave it out otherwise.

- `PUBLIC_WEBSITE_URL` is the canonical origin of this website, such as `https://www.example.com`. Set, pages emit canonical and `og:url` metadata; unset, they omit it.
- `PUBLIC_WEBAPP_URL` is the origin of the authenticated `webapp`, such as `https://app.example.com`. Unset, the landing page keeps its local next-step link and the site builds without a web app. Set to anything other than an absolute `http(s)` URL, the build fails with an error that names the variable (`src/lib/landing-actions.ts`), so a release cannot ship a dead call to action. In production the unified release fills both values from Terraform outputs, see Deployment below.

## Deployment

When the website has only fully prerendered output and no server islands or runtime-rendered routes, `website/dist` is fully static. Terraform creates a DigitalOcean App Platform Static Site or a Yandex Object Storage website bucket according to `CHECKLIST.md`. The unified release supplies `PUBLIC_WEBSITE_URL` and `PUBLIC_WEBAPP_URL`, rebuilds after either changes, and publishes/deploys the exact release. Without a canonical URL, pages omit canonical and `og:url` metadata. Follow [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) and run `bun run release -- <digitalocean|yandex>`.

On the default DigitalOcean/Yandex path, "regeneration" means redeploying static output or letting CDN/runtime cache refresh. It is not the same product feature as built-in Next/Vercel on-demand ISR.

If that redeploy ever needs to happen automatically, it is a background task rather than a new service - see "Rebuilding a static site" in [../docs/BACKGROUND_JOBS.md](../docs/BACKGROUND_JOBS.md), which also explains why the template documents it instead of shipping it.

### SSR upgrade path

Do this only when a route actually needs server rendering. Do not use SSR just because the product is a marketplace. Steps (also summarized in `astro.config.mjs`):

1. Install a Node adapter that matches the installed Astro version: `bun add @astrojs/node --cwd website`. Verify the resolved version's `astro` peer range covers the installed Astro; a major mismatch fails the build.
2. Register it in `astro.config.mjs` as `adapter: node({ mode: 'standalone' })` and keep `output: 'static'`. With an adapter, `astro build` emits `dist/client` (static assets/HTML) plus `dist/server` (runtime entry), so the static output dir becomes `website/dist/client`.
3. Mark the dynamic route with `export const prerender = false`.
4. Extend the selected Terraform stack to deploy this surface as a runtime **service/container** instead of static hosting, since SSR routes need the Node server at runtime.

Keep dynamic pages fresh with HTTP cache headers (`Cache-Control`, `stale-while-revalidate`) in front of a CDN once the website is deployed as a runtime service. Per-page incremental static regeneration (ISR) is a platform feature of Vercel/Netlify-style deployments and is **not** available on DigitalOcean App Platform Static Sites or Yandex Object Storage, so do not design the default path around it.

## Practice

Keep website-specific UI and content in this workspace. Do not duplicate authenticated browser-app flows from `webapp`. Auth inside `website` is acceptable only for small public-site needs, such as a logged-in header state or lightweight listing actions. Full buyer account, seller/admin, checkout/account, and dashboard workflows stay in `webapp` unless they have a concrete SEO requirement. An anonymous local cart or selected offer may start here, but it contains only untrusted identifiers and quantities and hands off to the single authenticated `webapp` checkout. Never add payment creation, card entry, authoritative totals, order state, or provider webhooks to `website`.

If the website starts reading API data or shared DTOs, add `@web-app-demo/contracts` intentionally and validate the producer/consumer path. Add `@astrojs/react` only when a page needs interactive React islands.

Astro remains the default here because it is content-first, static-first, low-JS by default, and easy for agents to reason about as the SEO surface. Choose Next.js only when the project intentionally wants a Vercel-optimized ISR/cache platform. Treat TanStack Start as an optional future React full-stack path for teams that want one React app with selective SSR, not as this template's default website stack.

## Current Upstream Documentation

For Astro, routing, content, on-demand rendering, adapters, build, or deployment questions, consult the current upstream documentation linked here first. This README describes this workspace's conventions; upstream docs are authoritative for Astro behavior.

- [Astro docs](https://docs.astro.build/en/getting-started/)
- [Astro project structure](https://docs.astro.build/en/basics/project-structure/)
- [Astro pages and routing](https://docs.astro.build/en/basics/astro-pages/)
- [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Astro deployment guides](https://docs.astro.build/en/guides/deploy/)
- [TypeScript docs](https://www.typescriptlang.org/docs/)
- [Vite guide](https://vite.dev/guide/)

The NIKASS cart now links to the sole guest `/checkout` in `PUBLIC_WEBAPP_URL`,
passing only identifiers and quantities in the URL fragment. Website still uses
its local catalog; live SKU mapping must be verified before launch. Order fields,
price/coupon validation and confirmation belong to webapp/backend; see
[../docs/ORDERS.md](../docs/ORDERS.md).
