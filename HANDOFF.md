# LÉVANCE — Phase 1 Codebase Audit / Handoff Report

**Audit date:** 2026-08-19  
**Source:** `levance-phase1.zip` (extracted to this repository root)  
**Auditor role:** Codebase takeover / audit only (no new feature implementation)

This report follows the handoff instructions exactly. No architecture was rewritten. No credentials were invented. External services were not assumed connected. Validation commands that could not be fully executed in this environment are marked clearly.

---

## 1. Current project architecture

Layered Next.js App Router application with clear server/client boundaries:

```
Browser (Client Components, anon key + RLS)
    ↓
Next.js App Router (Server Components / Server Actions / Route Handlers)
    ├─ lib/auth          — session resolution + RBAC guards
    ├─ lib/db            — three Supabase client boundaries
    ├─ lib/validation    — Zod schemas
    ├─ lib/integrations/stripe — payment boundary (mostly stubs)
    └─ lib/integrations/cj     — fulfillment boundary (stubs)
    ↓
Supabase (Postgres + Auth + RLS)
    ↓
Stripe (webhook boundary) · CJ Dropshipping (server-only boundary)
```

**Route groups:**
- `app/(storefront)/` — public marketing + shop
- `app/(auth)/` — login / signup / forgot-password
- `app/(shopping)/` — cart / checkout / order-confirmation
- `app/account/` — customer account (session-gated in layout)
- `app/admin/` — admin dashboard (`requireAdmin()` in layout)
- `app/api/stripe/webhook/` and `app/api/cj/webhook/` — webhook receivers

**Design system:** Centralized Tailwind tokens (`obsidian`, `ivory`, `champagne`, neutrals) + CSS variables in `globals.css`. Fonts: Playfair Display (display) + Inter (body) via `next/font`.

**Security model (defense in depth):**
1. Middleware — session refresh + coarse UX redirects only
2. Server-side `requireAdmin()` / `requireUser()` + `getCurrentUser()` (DB role re-fetch)
3. Postgres RLS on every table

---

## 2. Technologies

| Layer | Choice | Version / notes |
|-------|--------|-----------------|
| Framework | Next.js App Router | 15.1.4 |
| Language | TypeScript | strict (`noUncheckedIndexedAccess`, `noImplicitReturns`, etc.) |
| UI | React | 19.0.0 |
| Styling | Tailwind CSS | 3.4.x + PostCSS |
| Database / Auth | Supabase (Postgres + Auth + RLS) | `@supabase/supabase-js` ^2.47, `@supabase/ssr` ^0.5 |
| Payments | Stripe | `stripe` ^17.5 (boundary only) |
| Fulfillment | CJ Dropshipping | Custom boundary (stubs) |
| Validation | Zod | ^3.24 |
| Utils | `clsx` + `tailwind-merge` | cn() helper |
| Deploy target | Vercel | Documented, not yet configured in-repo |
| Package manager | npm | (lockfile not present in the zip; generated on install) |

No test runner is configured. No Playwright/Cypress/Jest scripts exist.

---

## 3. Completed features

- Full folder structure and routing for every planned page (storefront, auth, shopping, account, admin, webhooks).
- Design system (tokens, Button, Card, header, footer, focus states, reduced-motion).
- Three Supabase client boundaries:
  - `supabase-browser.ts` (anon + RLS)
  - `supabase-server.ts` (anon + cookie session + RLS)
  - `supabase-admin.ts` (`server-only` + service role, RLS bypass)
- Session resolution (`getCurrentUser`) that re-reads `profiles.role` from the DB on every call.
- Server-side RBAC: `requireAdmin()`, `requireUser()`.
- Middleware: session cookie refresh + unauthenticated redirect for `/account` and `/admin` (explicitly documented as non-security boundary).
- Complete ordered SQL migrations (0001–0009) with RLS enabled in the same migration that creates each table.
- `is_admin()` security-definer helper.
- Profile auto-creation trigger on `auth.users` insert.
- Stripe integration **boundary**: client factory, `isStripeConfigured()`, signature verification (`constructWebhookEvent`), webhook route that never leaks internal errors. Checkout session creation and event handling intentionally throw “not implemented”.
- CJ integration **boundary**: typed interfaces, `isCjConfigured()`, all operations throw “not implemented”. Marked `server-only`.
- Zod schemas for auth (login/signup/forgot-password) and product filter.
- Environment validation helper (`lib/utilities/env.ts`).
- Documentation: README, ARCHITECTURE, DATABASE, SECURITY, INTEGRATIONS, DEPLOYMENT, `.env.example`.
- Admin Integrations page reports real configuration status (not hard-coded “Connected”).
- Dev-only seed data clearly marked `[DEV]`.

---

## 4. Partially completed features

- **Storefront UI** — Home has a real hero + design tokens; shop, category, product pages are scaffolds (`RouteScaffold`).
- **Auth experience** — Routes exist; forms, Server Actions, and session handling after login/signup are not implemented.
- **Account area** — Layout correctly gates on session; all child pages are placeholders.
- **Admin area** — Layout correctly calls `requireAdmin()`; all child pages are placeholders except Integrations (which shows config status).
- **Cart / Checkout / Order confirmation** — Routes + DB schema exist; no business logic, no guest cart cookie handling implemented in application code yet.
- **Stripe** — Signature verification works; order-paid handling and Checkout Session creation are stubs.
- **CJ** — Full typed surface + DB tables; every function is a stub. Auth scheme is explicitly unverified against live CJ docs.
- **Database types** — `lib/db/types.ts` is a minimal hand-written placeholder covering only `profiles`. Full generated types are missing.
- **Images** — `next.config.ts` has empty `remotePatterns`; no product image pipeline.

---

## 5. Missing features (Phase 2 and beyond)

- Membership system (COMMON / PRO / PREMIUM / MONARCH tiers, database tables, security, founder invitation flow for MONARCH).
- Real storefront product listing, filtering, product detail pages wired to Supabase.
- Working authentication UI + Server Actions (email/password, password reset, session persistence UX).
- Customer account functionality (orders list/detail, wishlist, profile edit, addresses CRUD).
- Cart add/update/remove (auth + guest), checkout flow, order creation.
- Stripe Checkout Session creation + webhook that marks orders paid and triggers fulfillment.
- CJ product/inventory sync jobs and order creation after payment.
- Admin CRUD for products, orders, customers, analytics, settings.
- Email (Resend variables are in `.env.example` but no code uses them).
- Rate limiting, CSRF hardening beyond framework defaults, audit logging beyond `payments.raw_event` / `cj_sync_logs`, dependency scanning, tests.
- Vercel project configuration, production env vars, Stripe webhook endpoint registration.
- Generated Supabase TypeScript types.
- Any membership-related RLS or authorization (none exists yet).

---

## 6. Existing routes

| Path | Type | Status |
|------|------|--------|
| `/` | Storefront home | Partial (hero only) |
| `/shop` | Shop listing | Scaffold |
| `/category/[slug]` | Category | Scaffold |
| `/product/[slug]` | Product detail | Scaffold |
| `/login` | Auth | Scaffold |
| `/signup` | Auth | Scaffold |
| `/forgot-password` | Auth | Scaffold |
| `/cart` | Shopping | Scaffold |
| `/checkout` | Shopping | Scaffold |
| `/order-confirmation/[id]` | Shopping | Scaffold |
| `/account` | Account overview | Scaffold (layout gated) |
| `/account/orders` | Account | Scaffold |
| `/account/orders/[id]` | Account | Scaffold |
| `/account/wishlist` | Account | Scaffold |
| `/account/profile` | Account | Scaffold |
| `/account/addresses` | Account | Scaffold |
| `/admin` | Admin overview | Scaffold (layout gated by `requireAdmin`) |
| `/admin/products` | Admin | Scaffold |
| `/admin/orders` | Admin | Scaffold |
| `/admin/customers` | Admin | Scaffold |
| `/admin/analytics` | Admin | Scaffold |
| `/admin/integrations` | Admin | Partial (real config status) |
| `/admin/settings` | Admin | Scaffold |
| `/api/stripe/webhook` | Route Handler | Signature verify implemented; handler stub |
| `/api/cj/webhook` | Route Handler | Placeholder |

---

## 7. Existing database tables

From migrations:

- `profiles` (1:1 with `auth.users`, `role` enum)
- `categories`
- `products` (optional `cj_product_id`)
- `product_variants` (optional `cj_variant_id`)
- `product_images`
- `inventory`
- `carts` (user_id **xor** guest_token)
- `cart_items`
- `wishlists` / `wishlist_items`
- `addresses`
- `orders` + `order_items`
- `payments` (service-role write only)
- `shipments`
- `cj_products`, `cj_variants`, `cj_inventory`, `cj_orders`, `cj_order_items`, `cj_shipments`, `cj_sync_logs`
- `reviews`
- `coupons`

Enums: `user_role`, `order_status`, `payment_status` (and any others defined in later migrations).

**No membership / subscription / invitation tables exist.**

---

## 8. Existing migrations

Ordered and present:

1. `0001_init_extensions.sql` — `pgcrypto`
2. `0002_profiles_rbac.sql` — profiles, role enum, trigger, `is_admin()`, RLS
3. `0003_catalog.sql` — categories, products, variants, images, inventory + RLS
4. `0004_cart.sql` — carts, cart_items + RLS
5. `0005_wishlist.sql` — wishlists, wishlist_items + RLS
6. `0006_addresses.sql` — addresses + RLS
7. `0007_orders.sql` — orders, order_items, payments, shipments + RLS (payments have **no** insert/update policy for any role)
8. `0008_cj_integration.sql` — all `cj_*` tables + admin-only RLS
9. `0009_reviews_coupons.sql` — reviews, coupons + RLS

`supabase/seed.sql` — dev-only `[DEV]` products/categories.

---

## 9. Existing RLS policies (summary)

- **Public read / admin write:** categories, products (active only for public), variants, images, inventory.
- **Owner read/write + admin override:** carts/items (user-owned only; guests handled outside RLS), wishlists, addresses, reviews (insert/update), orders/items/shipments (owner read).
- **Admin only:** all `cj_*` tables, coupons.
- **Special:** `payments` — select for owner; **no insert or update policy** for any authenticated role. Only service-role client can write (intended for Stripe webhook).
- Profile update policy prevents a user from changing their own `role`.
- `is_admin()` used consistently.

---

## 10. Existing authentication flow

- Supabase Auth (email/password expected).
- Middleware refreshes session cookies on every matched request.
- `getCurrentUser()` → `supabase.auth.getUser()` + DB lookup of `profiles.role`.
- Unauthenticated access to `/account/*` or `/admin/*` redirects to `/login?redirectTo=...` (middleware + layout).
- No login/signup/forgot-password Server Actions or form components exist yet.
- No OAuth providers configured in code.
- Profile row is auto-created on signup via trigger (role defaults to `customer`).

---

## 11. Existing RBAC system

- Single source of truth: `profiles.role` (`customer` | `admin`).
- `requireAdmin()` redirects non-admins to `/` (or login).
- `requireUser()` redirects unauthenticated users to `/login`.
- Admin layout calls `requireAdmin()` on every request under `/admin`.
- Account layout calls `getCurrentUser()` and redirects if null.
- Role is never trusted from JWT claims alone; always re-fetched.
- RLS policies independently enforce the same rules.

**No membership tiers (COMMON/PRO/PREMIUM/MONARCH) exist in RBAC or schema.**

---

## 12. Existing Stripe integration status

| Piece | Status |
|-------|--------|
| SDK client (`getStripeClient`) | Implemented (server-only, fails fast if key missing) |
| `isStripeConfigured()` | Implemented |
| Webhook signature verification | Implemented |
| Webhook route (`/api/stripe/webhook`) | Implemented (raw body, safe error responses) |
| `createCheckoutSession` | Stub — throws |
| `handleWebhookEvent` | Stub — throws |
| Order paid → CJ trigger | Not present |
| Frontend success page as payment proof | Explicitly forbidden by design |

API version pinned to `2024-12-18.acacia` (must be reconfirmed against live Stripe Dashboard before real use).

---

## 13. Existing CJ integration status

| Piece | Status |
|-------|--------|
| `isCjConfigured()` | Implemented |
| Client / base URL | Placeholder |
| Auth mechanism | **Not implemented** (and marked as unverified against current CJ docs) |
| All API methods (`searchProducts`, `getProduct`, `syncProduct`, `createOrder`, `getTracking`, …) | Stubs — throw |
| DB tables + RLS | Present (admin-only) |
| Webhook route | Placeholder |

Sync invariants documented (must not overwrite LÉVANCE retail price, marketing copy, etc.).

---

## 14. Existing Vercel / deployment status

- Target documented in `DEPLOYMENT.md`.
- No `vercel.json`, no project link, no production environment variables present in the repo.
- `next.config.ts` is minimal (strict mode, empty image remotePatterns, serverActions body limit).
- Ready for import into Vercel once env vars are set and migrations applied.

---

## 15. Environment variables required

From `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

CJ_API_BASE_URL=
CJ_API_KEY=
CJ_API_SECRET=
CJ_ACCESS_TOKEN=

NEXT_PUBLIC_SITE_URL=

RESEND_API_KEY=
EMAIL_FROM=
```

CJ credential names are placeholders pending verification against current CJ documentation.

---

## 16. Build / type / lint / test results

| Command | Result |
|---------|--------|
| `npm install` | **PARTIAL / INCOMPLETE** — multiple attempts timed out or left an incomplete `node_modules` in this sandbox (network/timeout constraints). Core packages such as `next` were not fully available for subsequent commands. |
| `npm run typecheck` | **NOT RUN** — dependencies incomplete; `tsc` not reliably available. |
| `npm run lint` | **NOT RUN** — same reason. |
| `npm test` | **NOT RUN** — no test script or test runner configured in `package.json`. |
| `npm run build` | **NOT RUN** — dependencies incomplete. |

**Do not treat the project as validated.** The original README already stated that validation had never been run in the generation environment. Re-run all four commands (`install`, `typecheck`, `lint`, `build`) in a normal networked environment before relying on the codebase.

---

## 17. Known bugs / gaps

- `lib/db/types.ts` only types `profiles`. Any code that queries other tables currently has incomplete type safety.
- Stripe API version may be outdated by the time real integration begins.
- CJ auth scheme and endpoint shapes are explicitly unconfirmed.
- Guest cart cookie signing / validation logic is described in docs but not implemented in application code.
- Admin Integrations page imports `isStripeConfigured` / `isCjConfigured` from modules that use `server-only` — correct for RSC, but any future client-side use would fail the build (by design).
- Empty `public/` directory (no favicon, no static assets).
- No `next-env.d.ts` in the zip (normally generated by Next.js on first run).
- Multiple npm install processes can leave the tree in a dirty state if interrupted.

---

## 18. Security concerns

**Strengths (already present):**
- Service-role key isolated behind `server-only` + explicit throw if missing.
- Payments table has no client-writable policies.
- Role self-elevation blocked in RLS profile update policy.
- Webhook errors never leak internal detail.
- Middleware is correctly documented as non-authoritative.
- Secrets never appear in client bundles by construction.

**Gaps / future risks (none are critical build-breakers today):**
- No rate limiting on auth or webhook endpoints.
- No membership system yet → the Phase 2 MONARCH “never publicly purchasable” rule has nothing to enforce against yet.
- Incomplete TypeScript Database types increase risk of incorrect queries.
- No automated tests for RLS or RBAC.
- CJ credentials scheme still provisional.
- Dependency vulnerability scanning not present.
- `RESEND_API_KEY` listed but unused (no email sending code).

No critical security holes that would prevent the foundation from functioning were found. The security model is intentionally conservative and well-documented.

---

## 19. Recommended next development step

1. **Validate the foundation in a real environment**  
   ```bash
   npm install
   npm run typecheck
   npm run lint
   npm run build
   ```
   Fix any first-run TypeScript / Next.js 15 / dependency issues before adding features.

2. **Generate full Supabase types** once a project is linked  
   `npx supabase gen types typescript --project-id <id> > lib/db/types.ts`

3. **Apply migrations** to a Supabase project and confirm RLS with manual tests (try to read another user’s cart/order as a non-admin).

4. **Begin Phase 2 in this order (per original intent):**
   - Authentication UI + Server Actions (login/signup/forgot-password) wired to Supabase Auth.
   - Membership database architecture + RLS + server-side enforcement for the four tiers (COMMON / PRO / PREMIUM / MONARCH), with MONARCH invitation-only and never publicly purchasable.
   - Real storefront pages reading from catalog tables.
   - Customer account pages.
   - Cart + checkout + Stripe Checkout Session + verified webhook that marks orders paid.
   - CJ sync and fulfillment after paid status.

Do **not** weaken the existing three-layer security model. Do **not** put membership elevation logic in the client. Do **not** treat frontend redirects as payment proof.

---

**End of audit.**  
No new features were implemented. No credentials were invented. The codebase is ready for the next developer to begin Phase 2 after successful local validation.
