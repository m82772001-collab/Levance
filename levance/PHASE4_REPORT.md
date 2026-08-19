# LÉVANCE — Phase 4 Report
## CJ Dropshipping Real Commerce Integration

**Date:** 2026-08-19  
**Rule honored:** Live endpoints and auth taken only from official CJ API 2.0 documentation. Unknowns documented; not invented.

---

## 1. Official documentation used

- https://developers.cjdropshipping.com/en/api/api2/
- https://developers.cjdropshipping.com/en/api/api2/api/auth.html
- https://developers.cjdropshipping.com/en/api/start/Orders-Synchronization-Processing.html
- https://developers.cjdropshipping.com/en/api/start/webhook.html
- https://developers.cjdropshipping.com/en/api/start/sandbox.html
- https://developers.cjdropshipping.com/en/api/api2/standard/definition.html
- Field definitions & order status tables from CJ standard field docs

---

## 2. Authentication method

- **API Key** → `POST /api2.0/v1/authentication/getAccessToken` `{ apiKey }`
- **Refresh** → `POST .../refreshAccessToken` `{ refreshToken }`
- **Header** → `CJ-Access-Token`
- Server-only; `isCjConfigured()` requires `CJ_API_KEY`
- Connection status on admin page calls live token endpoint (not hard-coded “Connected”)

---

## 3. Endpoints implemented

| Function | Endpoint |
|----------|----------|
| searchProducts / getProduct | `/product/list`, `/product/query` |
| getVariants | `/product/variant/query`, `queryByVid` |
| getInventory | `/product/stock/queryByVid` |
| createOrder | `/shopping/order/createOrderV3` |
| getOrder | `/shopping/order/getOrderDetail` |
| getTracking | `/logistic/trackInfo` |

---

## 4. Product import

- Admin UI: `/admin/integrations/cj`
- Search → import with markup % → draft or publish
- Maps into `products` / `product_variants` + `cj_products` / `cj_variants`
- Re-import does not overwrite LÉVANCE title/description merchandising

---

## 5. Inventory sync

- Manual from admin
- Cron: `GET /api/cron/cj/inventory` (Bearer `CRON_SECRET`)
- Writes `cj_inventory` + `inventory`

---

## 6. Pricing sync

- `lib/integrations/cj/pricing.ts`: percent / fixed / combined markup
- Env: `CJ_MARKUP_PERCENT`, `CJ_MARKUP_FIXED_CENTS`
- Sell price stored on `product_variants.price_cents` at import
- Continuous supplier-price auto-repricing of live retail is **not** forced on every sync (protects merchandising); inventory sync does not rewrite price

---

## 7. Shipping

- Order create accepts address fields from LÉVANCE order
- Freight calculate API **not** fully wired (request shape account-specific) — **documented unknown**
- Fallback: no invented delivery estimates on storefront

---

## 8. Order creation

- Trigger: Stripe webhook after paid
- `fulfillPaidOrder` → createOrderV3 with `orderFlow=1`
- Idempotent via existing `cj_orders.order_id`

---

## 9. Tracking

- Cron `/api/cron/cj/tracking`
- Updates `shipments` + order status shipped/delivered when data present

---

## 10. Webhooks / polling

- CJ ORDER/PRODUCT webhooks exist officially
- **Verification scheme not fully locked in code** — polling preferred until account webhook secret is confirmed
- Existing `/api/cj/webhook` remains placeholder-safe

---

## 11. Database changes

- Migration **0012_cj_phase4.sql**: `cj_orders.raw`, `last_synced_at`, `idempotency_key`, unique `order_id`; `cj_sync_logs.metadata`; optional `products.supplier_cost_cents`

---

## 12. RLS

- Unchanged admin-only policies on `cj_*` tables
- Customers cannot read/write supplier tables
- Fulfillment uses service-role client only

---

## 13. Vercel cron

`vercel.json`:

- Inventory every 6 hours
- Tracking every 4 hours (+30m)

Requires `CRON_SECRET` and Vercel cron auth headers as deployed by platform.

---

## 14. Environment variables

See `.env.example` — `CJ_API_KEY`, optional base URL / refresh / sandbox / markup / `CRON_SECRET`.

---

## 15. Error handling

- Sync logs without secrets
- CJ failure after payment → order stays **paid**, log error, admin retry action

---

## 16. Idempotency

- One `cj_orders` row per LÉVANCE `order_id`
- Skip create if `cj_order_id` already set

---

## 17. Testing

- No automated test suite in repo
- Live CJ tests require real API key (not run in this sandbox)

---

## 18. Validation results

| Command | Result |
|---------|--------|
| npm install / typecheck / lint / build | **NOT RUN** in this sandbox (same environment limits as prior phases) |
| Live CJ auth / import / order | **NOT RUN** — no production CJ credentials in environment |

Run locally with `CJ_API_KEY` and migrations `0008` + `0012` applied.

---

## 19. Remaining blockers

1. Confirm freight-calculate payload for your logistics methods before checkout shipping quotes.
2. Confirm webhook signing for CJ push; enable `/api/cj/webhook` verification.
3. Durable token storage for multi-instance serverless.
4. Full response-field mapping QA against live product payloads.
5. Image storage policy vs hotlinking (legal/ops decision).

---

**STOP.** Phase 4 complete. No further major phase started.
