# NIKASS guest orders

The active guest checkout form is `website /checkout`; it reads versioned
slug/SKU/quantity from the same-origin cart and uses the shared contracts from the proven
webapp flow. Guest ordering was approved on 2026-09-08 and consolidated into the
single storefront on 2026-09-11. No login is required; the current local slice
also supports a YooKassa test payment. Contacts and address are kept in form
memory, not browser storage. A random 256-bit checkout capability is stored in
the current tab; PostgreSQL stores its hash. Never log request bodies or tokens.

## API and ownership

- `POST /api/orders/quote`: `{ cart, customer, promoCode }`. Shared schemas in
  `packages/contracts/src/orders.ts` define all fields. The server creates a
  private WooCommerce cart, resolves the exact SKU, sets the Russian address,
  selects free shipping and applies the coupon. The response contains totals
  in kopecks and a private `checkoutToken`, valid for submission for 15 minutes.
- `POST /api/orders`: `{ checkoutToken }`, after the shopper confirms the quote.
  Fresh cart checks and Store API `expected_total` reject price changes. Native
  WooCommerce validates stock and coupon rules during checkout. Clients cannot
  submit a price, discount, delivery cost, payment status or order status.
- `POST /api/orders/status`: same token, returns only state/order number. This legacy/manual-order
  endpoint remains available for the non-payment path.
- `POST /api/orders/payment`: same token, creates one hosted YooKassa payment from the stored server
  totals and returns its provider redirect URL plus a public `attemptId` recovery marker. Existing
  pending payments can be resumed after the quote's 15-minute expiry; terminal payments never
  return an active payment link. The idempotency key is derived from the private
  checkout attempt; the browser never sends an amount or payment credentials.
- `POST /api/orders/payment/status`: payment id, which the backend reconciles with a fresh YooKassa
  `GET /v3/payments/{id}` before returning payment and fulfillment state.
- `POST /api/orders/payment/webhook`: YooKassa notification endpoint. The body is validated, then the
  backend fetches the current provider object and enqueues durable fulfillment; a return URL alone
  never marks a payment successful.
  Responses are no-store. Tokens never appear in query strings or URL paths.

WooCommerce remains the sole order authority. PostgreSQL `checkout_attempts`
is a private submission log, not a second editable order catalog. A conditional
state transition allows only one remote submission per quote, including across
API processes. Verified payment and successful WooCommerce fulfillment commit
with a Telegram `orders:notify` task and, when configured, a separate email task.
Telegram includes product names/SKUs, quantities, line totals, total and discount,
customer name, phone, email, delivery method, address and comment. The recipient is
only the server-configured `ORDER_TELEGRAM_CHAT_ID`; the task payload contains
only the checkout attempt ID and channel. The delivery handler checks payment,
fulfillment and order number again before reading/sending customer details.
Legacy unpaid submissions queue email only, never Telegram. Failures retry
independently via `outbox:drain`.
Delivery is at-least-once: an ambiguous provider acknowledgment can duplicate a
notification, including previously accepted parts of a long order. Full order
text is split into Unicode-safe messages below Telegram's 4096-character limit.
Messages use plain text, disable link previews and enable `protect_content`.
This restricts forwarding/saving; members of the recipient group can still read
or manually copy the data. Restrict group membership accordingly.
No real notification or actual order was sent during implementation.

Customer contacts and address remain in form memory and server-side storage,
never checkout `localStorage` or `sessionStorage`. Opening checkout rewrites
legacy saved snapshots without customer data, including after payment returns.
Browser recovery keeps only cart identifiers and a cart revision, quote totals, the opaque checkout
capability, payment ID and public attempt marker; public status responses never include contacts.
After a redirect, contact details are intentionally omitted from the receipt UI.
Checkout API URLs require HTTPS except for local loopback development. Telegram,
WooCommerce and payment credentials remain backend-only. Raw card details are
entered only on the hosted payment page.

Opening `/cart` checks saved payments in the current tab with the backend. Before
showing the basket, pending payments offer “Продолжить предыдущую оплату” or
“Перейти к новой корзине”, with a warning that both paid attempts produce separate
orders. Proceeding leaves the old payment active and hands off the current basket
as a fresh checkout; it does not cancel or mutate the old attempt. Succeeded and
canceled payments do not block the basket. If status verification fails, the saved
payment remains recoverable and the user can still proceed with the current basket.
Previous payment snapshots stay in `nikass-checkout-payments` for the tab's lifetime,
without contacts. New hosted payments return to `/checkout#attempt=<uuid>` so an
older payment can recover its own snapshot even after a newer checkout; the fragment
grants no API access and is removed after recovery. Payment links created before
this change retain their original return URL; use the basket's continuation action
to select their snapshot before returning. Recovery requires the original tab's
session storage. On checkout return, a verified pending payment recovers its existing
hosted URL through the checkout capability when it still passes the backend stock check;
the public status response does not expose payment links. Each cart write creates a
new revision, which checkout captures and preserves through quotes, payment redirects
and archived snapshots. Starting another basket from a receipt clears the cart only when its revision still matches
that checkout; a rebuilt basket with identical items is preserved. Legacy snapshots
without a revision never automatically clear the shopping basket.
Publish the updated website before the backend: its optional `attemptId` accepts
old responses, while the old website's strict schema rejects the new response field.
No database migration or payment-provider configuration change is required.

`YOO_KASSA_FULFILLMENT_MODE=disabled` skips WooCommerce creation and paid-order
notifications, including successful test payments. Successful test payments can
create orders in the configured WooCommerce store only when the non-production
backend explicitly sets `YOO_KASSA_FULFILLMENT_MODE=woocommerce` and
`YOO_KASSA_TEST_FULFILLMENT_ENABLED=true`. Production rejects the test-only flag.
The WooCommerce order itself has no test label and looks like a normal paid order;
the internal Telegram notification still says `Тестовая оплата`.

## Activation

1. Start the documented Docker PostgreSQL, generate/apply the pending Prisma migration with
   `bun run --cwd backend prisma:migrate -- --name add_yookassa_payment_states` and then
   `bun run --cwd backend prisma:deploy`. The migration must be generated by Prisma, not hand-written.
2. Set `CATALOG_PROVIDER=woocommerce`, the products endpoint and existing
   WooCommerce REST keys. Set `WOOCOMMERCE_STORE_ENDPOINT` to the full HTTPS base
   ending in `/wp-json/wc/store/v1`, on the same store. Store API must be reachable;
   it uses private Cart-Token headers, not the admin Basic Auth credential.
3. Configure WooCommerce in RUB, with guest checkout enabled, physical products
   and a `free_shipping` rate for Russia, titled СДЭК. The manager books delivery
   manually. Enable the native offline `cheque` gateway and rename its title to
   «Согласование с менеджером»; clear cheque-specific descriptions/instructions.
   This native gateway places nonzero orders on hold and reduces stock without
   taking payment. Zero-value orders use WooCommerce's free-order completion path.
4. Configure the approved `PUBLIC_PRIVACY_URL` in `website`. Purchase terms link to the site's `/payment-and-delivery` page; `PUBLIC_TERMS_URL` is no longer used.
   Until documents exist, the form can validate fields but refuses sending personal data.
   Set `PUBLIC_API_URL` and backend CORS origins to the actual storefront/API locations.
5. Configure real backend email delivery, `ORDER_MANAGER_EMAIL`,
   `ORDER_TELEGRAM_BOT_TOKEN`, `ORDER_TELEGRAM_CHAT_ID`, and the outbox scheduler.
   `ORDERS_ENABLED=true` requires these; disabled/console delivery is rejected.
   Nothing is enabled by default, and no fake orders are returned.
6. Configure WooCommerce customer on-hold confirmation email. Disable duplicate
   Woo manager new-order emails when using backend notifications, and disable
   unneeded customer status-change emails. Verify one confirmation on the actual
   store, including free orders, before enabling customer checkout.
7. Verify the installed Store API supports `expected_total` with a deliberately
   changed price (must reject 409). Verify stock races, stock return on manager
   cancellation, percent/fixed coupons, expiry, minimum spend, per-customer and
   global usage limits, and real delivery addresses. No live WooCommerce was
   available for these checks; mocked adapter tests do not prove store behavior.

8. For YooKassa test payments, locally or on the password-protected Beget test VPS, set
   `YOO_KASSA_ENABLED=true`, `YOO_KASSA_TEST_MODE=true`, the test Shop ID/key and
   `YOO_KASSA_RETURN_URL` to the exact `/checkout` URL used by the browser
   (`http://127.0.0.1:4322/checkout` locally, `https://YOUR_DOMAIN/checkout` on the VPS).
   Before creating a payment, the backend checks `/v3/me` and refuses if the connected shop's
   `test` mode does not match `YOO_KASSA_TEST_MODE`.
   Keep fulfillment disabled by default. To deliberately test order creation in the configured
   WooCommerce store, also set `YOO_KASSA_FULFILLMENT_MODE=woocommerce` and
   `YOO_KASSA_TEST_FULFILLMENT_ENABLED=true`; this is rejected in production. A successful test
   payment creates a normal paid/processing WooCommerce order, can reduce stock, and may trigger
   WooCommerce emails or integrations. Use test customer contact details. Before deleting a test
   order, move it to Cancelled so WooCommerce restores tracked stock; cancellation emails may also
   be configured. A real webhook needs a public HTTPS API URL configured in YooKassa; localhost
   cannot receive it.

Fields validate format, lengths, required values and Russian phone/postcode;
they do not verify that a street/building exists. The form also collects the region required by native WooCommerce address validation; installed address customizations must be checked against these fields.

## Recovery and retention

`submitting` or `uncertain` means a remote write may already have succeeded.
Never reset that attempt or blindly retry checkout. The UI preserves the
capability and offers status refresh. A manager/operator must compare the
attempt's customer, items and timestamp with WooCommerce, then reconcile the
order number and notification tasks. There is no automatic cross-system
reconciler or public order-history endpoint in this slice. A crash after Woo
success and before the PostgreSQL success transaction is the same recovery case.

The local log contains personal data and a private Woo cart token until success.
Restrict database access and backups. Before production, define retention and
an operator cleanup for expired/rejected attempts and completed attempts whose
notifications are terminal. Do not purge unresolved/uncertain attempts before
reconciliation. WooCommerce retains the authoritative order under its own policy.

## Local checks

- `bun test backend/src/modules/orders/infrastructure/notifications.test.ts backend/src/modules/orders/infrastructure/orders-store.test.ts` — full paid-order details, fixed recipient, unpaid/unfinished delivery rejection, long messages and safe errors.
- `WEBSITE_E2E_PORT=4346 PUBLIC_API_URL=http://127.0.0.1:4346 PUBLIC_PRIVACY_URL=https://example.test/privacy PUBLIC_YANDEX_SUGGEST_API_KEY= bun run --cwd website e2e -- checkout-privacy.spec.ts --project=desktop` — legacy contact cleanup and no contact persistence through quote/payment redirects, with mocked API/payment responses.
- `bun test packages/contracts/src/orders.test.ts backend/src/modules/orders/application backend/src/modules/orders/infrastructure/woocommerce-orders.test.ts backend/src/modules/orders/transport`
- `bun test backend/src/modules/orders/application/payments-service.test.ts backend/src/env.test.ts` — payment amount/mode binding and YooKassa environment guard.
- `bun run --cwd backend test:integration src/modules/orders/orders.integration.test.ts` — requires Docker.
- `bun run --cwd website e2e -- storefront.spec.ts` — SKU search, cart persistence, product relations and checkout navigation at 390/1280 px.
- `bun run --cwd website typecheck && bun run --cwd website build && bun run --cwd website test:build-contracts` — Astro/React cart-to-checkout UI and static output.
- `bun run typecheck:backend`, `bun run typecheck:webapp`, `bun run typecheck:website`, `bun run architecture:check`.

Official protocol references: [Cart tokens](https://developer.woocommerce.com/docs/apis/store-api/cart-tokens),
[Cart API](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart),
[Checkout API and expected_total](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/checkout/).

## Implementation verification — 2026-09-08

Primary signal: partially validated. The order contract/adapter/service/HTTP
suite passes (6 tests); the combined contracts/env/registry run passed 54 tests.
Browser handoff, field validation and recovery after a lost response pass at
390 and 1280 px (2 tests, mocked API). Both frontend builds, backend typecheck,
website typecheck (one existing chart deprecation hint), focused checkout ESLint,
architecture and template checks passed. Website unit/build-contract checks pass
26/7 tests respectively.

The PostgreSQL integration command could not start because Docker is unavailable;
its cleanup command likewise could not connect (no test container was started).
The migration is generated but not applied. Live WooCommerce, customer email and
manager delivery remain unverified. Temporary migration input and owned browser
test artifacts were removed. An orphaned legacy JSX fragment in webapp/pages.tsx
was removed to repair its pre-existing syntax error and allow the app build.
