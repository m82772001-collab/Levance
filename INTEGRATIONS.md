# Integrations

## Stripe

See Phase 2 docs. Payment confirmation is webhook-only. After `checkout.session.completed` with `payment_status=paid`, LÉVANCE marks the order paid and attempts CJ fulfillment.

## CJ Dropshipping (API 2.0)

**Official documentation used (2026):**

- https://developers.cjdropshipping.com/en/api/api2/
- https://developers.cjdropshipping.com/en/api/api2/api/auth.html
- https://developers.cjdropshipping.com/en/api/start/Orders-Synchronization-Processing.html
- https://developers.cjdropshipping.com/en/api/start/webhook.html
- https://developers.cjdropshipping.com/en/api/start/sandbox.html

### Authentication (verified)

| Step | Method | URL |
|------|--------|-----|
| Get token | POST | `https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken` |
| Body | JSON | `{ "apiKey": "<CJ API Key>" }` |
| Refresh | POST | `.../authentication/refreshAccessToken` body `{ "refreshToken" }` |
| API header | | `CJ-Access-Token: <accessToken>` |

- Access token lifetime: documented as ~15 days (also noted as 180 in one auth page — refresh proactively).
- Refresh token: ~180 days.
- Store tokens **backend only**; never expose to the browser.
- Success: HTTP 200 and (`code === 200` or no `code` field).

### Endpoints implemented

| Operation | Path |
|-----------|------|
| Product list | `POST /product/list` |
| Product query | `POST /product/query` |
| Variants by PID | `POST /product/variant/query` |
| Variants by VID | `POST /product/variant/queryByVid` |
| Stock by VID | `POST /product/stock/queryByVid` |
| Create order | `POST /shopping/order/createOrderV3` |
| Order detail | `GET /shopping/order/getOrderDetail` |
| Tracking | `GET /logistic/trackInfo` |

### Environment

```
CJ_API_KEY=                 # required
CJ_API_BASE_URL=            # optional, default official host
CJ_REFRESH_TOKEN=           # optional cache aid
CJ_SANDBOX=0|1
CJ_MARKUP_PERCENT=40
CRON_SECRET=                # Bearer for /api/cron/cj/*
```

`CJ_API_SECRET` is **not** required by current getAccessToken docs (apiKey only).

### Order sequence

Stripe webhook verifies payment → order `paid` → `fulfillPaidOrder` → `createOrderV3` with LÉVANCE `order_number` → store `cj_orders` → status `fulfilling`.  
If CJ fails: order stays **paid**; sync log records error; admin can retry.

### Webhooks

CJ supports PRODUCT and ORDER push messages (see official webhook docs). LÉVANCE `/api/cj/webhook` remains a receiver scaffold — **signature/verification details must be confirmed per CJ’s current webhook security mechanism before trusting payloads**. Prefer polling tracking via cron until webhook verification is fully documented for your account.

### Unknown / verify before production

1. Exact JSON field names for every product/variant nested property (response shapes vary; code normalizes common list wrappers).
2. Freight calculate request body for checkout shipping quotes — implement only after confirming parameters for your logistics methods.
3. Webhook authentication (HMAC/shared secret) — confirm in CJ account/webhook settings.
4. Token persistence across serverless instances — in-memory cache is best-effort; use durable secret store for production multi-instance.

### Customer experience

CJ IDs, costs, and API errors are never shown on the storefront. Customers see LÉVANCE order numbers, status, and tracking only.
