# LÉVANCE

Premium curated marketplace — fashion, beauty, tech, accessories, home & lifestyle.

**Tagline:** Elevate Your Everyday.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS · Supabase (Auth + Postgres + RLS) · Stripe · CJ Dropshipping (boundary) · Vercel

## Phase status

**Phase 1** — Foundation complete (architecture, schema, RLS, auth/RBAC boundaries, design system).

**Phase 2** — Commerce & membership foundation:

- Real authentication (login / signup / forgot / reset)
- Membership tiers (COMMON / PRO / PREMIUM / MONARCH) + RLS
- Monarch invitation system (token hash only)
- Customer account (orders, wishlist, profile, addresses)
- Storefront wired to Supabase catalog
- Cart (auth + guest) with server-side price/inventory checks
- Checkout order preparation (server-validated totals)
- Stripe Checkout Session + webhook structure (paid only via verified webhook)
- Membership benefit helpers (`hasMembership`, `hasBenefit`, `canAccess`)

**Not in this phase:** AI Private Showroom, Monarch Private Salon, live CJ API sync.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill real values
# Apply supabase/migrations/ in order (0001–0010)
npm run dev
```

See `DEPLOYMENT.md`, `DATABASE.md`, `SECURITY.md`, `INTEGRATIONS.md`.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint

## Security model

1. Middleware — session refresh + coarse redirects (not the security boundary)
2. Server-side `requireAdmin` / `requireUser` / `requireMonarchInvite`
3. Postgres RLS on every table

Membership and payment status are never trusted from the client.
