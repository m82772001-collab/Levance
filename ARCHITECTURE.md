# Architecture

## Layered overview

```
Browser (Client Components)
   │  anon key, RLS-scoped
   ▼
Next.js App Router (Server Components / Server Actions / Route Handlers)
   │
   ├─ lib/auth       — session resolution, RBAC guards
   ├─ lib/db         — three Supabase client boundaries (below)
   ├─ lib/validation — Zod schemas for all mutable input
   ├─ lib/integrations/stripe — payment boundary
   └─ lib/integrations/cj     — fulfillment boundary
   │
   ▼
Supabase (Postgres + Auth + RLS)
   │
   ├─ webhooks trigger service-role writes (payments, order status)
   ▼
Stripe (payments) · CJ Dropshipping (fulfillment, backend-only)
```

## Three Supabase client boundaries (`lib/db/`)

This is the core of the security model, so it's centralized rather than
left to each call site to get right:

| Client | Key | RLS applies? | Where used |
|---|---|---|---|
| `supabase-browser.ts` | anon | yes | Client Components |
| `supabase-server.ts` | anon + user session cookie | yes | Server Components, Server Actions, most route handlers |
| `supabase-admin.ts` | service role | **no — bypasses RLS** | Webhook handlers, CJ sync jobs only. Marked `server-only`; importing it into client-bundled code fails the build. |

Rule of thumb: if a Server Component or action is rendering/mutating data
*for the current user*, use `supabase-server.ts` and let RLS do the
scoping. Only reach for `supabase-admin.ts` when the operation legitimately
has no user context (a Stripe webhook, a scheduled CJ sync).

## Authorization (RBAC)

- `profiles.role` (`customer` | `admin`) is the single source of truth.
- `lib/auth/session.ts` re-reads the role from the database on every call
  — it does not trust a cached JWT claim, so a demoted admin loses access
  immediately.
- `lib/auth/rbac.ts` (`requireAdmin`, `requireUser`) is called at the top
  of every admin layout/server action — this is the real enforcement
  point.
- `middleware.ts` does a coarse, UX-only redirect for `/account` and
  `/admin`; it is explicitly documented as not being the security
  boundary, so nobody later treats it as sufficient on its own.
- Postgres RLS policies (see `DATABASE.md`) enforce the same rules a third
  time, independently of application code. Defense in depth: a bug in the
  Next.js layer cannot expose another customer's data or let a customer
  write to admin-only tables.

## Cart architecture

Supports both authenticated and guest carts via a single `carts` table
with a check constraint enforcing exactly one of `user_id` / `guest_token`.
Guest identity is a signed cookie-held UUID handled entirely server-side —
the browser never talks to Supabase directly for guest cart writes, so a
guest token can't be forged into reading another guest's cart.

## Order / payment architecture

Orders move through `pending → awaiting_payment → paid → fulfilling →
shipped → delivered`. Critically:

- `payments` rows can **only** be written by the service-role client, and
  only from the verified Stripe webhook handler (`app/api/stripe/webhook`)
  — there is no RLS insert policy for customers or even the anon-key
  admin path. A frontend "success" redirect is never treated as proof of
  payment.
- CJ fulfillment (`createOrder`) is only triggered after a `payments` row
  with `status = 'paid'` exists — enforced in application logic once the
  webhook handler is implemented (currently throws "not implemented" by
  design, see `INTEGRATIONS.md`).

## CJ architecture

```
CJ API  →  lib/integrations/cj (server-only)  →  Supabase (cj_* tables)  →  products/product_variants (storefront source of truth)
```

The browser never depends on CJ directly. `cj_*` tables hold raw
supplier-side data and sync bookkeeping; `syncProduct`/`syncInventory` are
the only path from CJ data into the customer-facing `products` /
`product_variants` tables, and are documented to never overwrite
LÉVANCE-specific fields (retail price, marketing copy, category, brand
presentation) unless explicitly configured to.

## Folder structure

```
app/
  (storefront)/        — public marketing + shop routes, shared header/footer
  (auth)/               — login, signup, forgot-password
  (shopping)/           — cart, checkout, order-confirmation
  account/              — customer dashboard, gated by session in layout.tsx
  admin/                — admin dashboard, gated by requireAdmin() in layout.tsx
  api/stripe/webhook/    — Stripe webhook receiver
  api/cj/webhook/        — CJ callback receiver (placeholder)
components/
  ui/                   — design-system primitives (Button, Card, ...)
  storefront/ account/ admin/ shared/ — feature-scoped components
lib/
  auth/                 — session + RBAC
  db/                   — Supabase client boundaries + generated types
  integrations/stripe/  — payment boundary
  integrations/cj/      — fulfillment boundary
  validation/           — Zod schemas
  utilities/            — cn(), env helpers, route scaffold shell
supabase/
  migrations/           — ordered SQL migrations (schema + RLS)
  seed.sql              — dev-only seed data, clearly marked
```

## Deployment architecture (target)

Vercel (Next.js) ↔ Supabase (managed Postgres/Auth) ↔ Stripe (webhook
pointed at `/api/stripe/webhook`) ↔ CJ Dropshipping (backend-only, called
from server code / scheduled sync, never from the browser).
