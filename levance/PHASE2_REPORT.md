# LÉVANCE — Phase 2 Implementation Report

**Date:** 2026-08-19  
**Scope:** Phase 2 commerce / membership foundation (2A–2K)  
**Constraint:** Did not rebuild Phase 1 architecture. Did not invent live Stripe/CJ behavior. Did not implement AI Private Showroom or Monarch Private Salon.

---

## 1. Completed features

### 2A — Project validation & configuration
- Inspected HANDOFF.md and full Phase 1 codebase.
- Added missing `server-only` dependency to `package.json`.
- Created `next-env.d.ts`.
- **npm install / typecheck / lint / build could not be fully completed** in this sandbox due to repeated timeouts and incomplete `node_modules` (see §10).

### 2B — Authentication
- Real login, signup, forgot-password, and reset-password flows.
- Server Actions: `loginAction`, `signupAction`, `forgotPasswordAction`, `resetPasswordAction`, `signOutAction`.
- Client forms with loading, error, and success states.
- Zod validation (including `resetPasswordSchema`).
- Safe redirect handling (relative paths only).
- Signup always targets COMMON membership (via `ensureCommonMembership`); client cannot choose PRO/PREMIUM/MONARCH.
- Profile still created by existing DB trigger; membership assignment uses service-role helper.

### 2C — Membership database
- Migration `0010_membership.sql`:
  - Enums: `membership_tier`, `membership_status`, `invitation_status`
  - Tables: `membership_tiers`, `membership_benefits`, `user_memberships`, `membership_history`, `membership_invitations`
  - Stripe subscription columns on `user_memberships`
  - Constraint: MONARCH cannot be `is_publicly_purchasable`
  - RLS: public read for tiers/benefits; owner read for memberships/history; no client write of tier; invitations admin/creator only
  - Helper `get_user_membership_tier()`
  - Seeded tier copy and benefits

### 2D — Membership tiers presentation
- `/membership` page with premium presentation for COMMON / PRO / PREMIUM / MONARCH.
- Official taglines used.
- **No** Buy Monarch button, Monarch checkout, public upgrade to Monarch, or fixed access code.

### 2E — Monarch invitation system
- Token generated with `crypto.randomBytes`; only **SHA-256 hash** stored.
- Create / revoke / accept flows (server-only).
- Email restriction, expiration, revocation, used_at, audit via `membership_history`.
- `/invite/[token]` acceptance page.
- `requireMonarchInvite()` capability (admin-role for Phase 2).

### 2F — Customer account (partial)
- `/account` overview shows real membership tier + benefits + sign-out.
- Sub-routes (orders, wishlist, profile, addresses) remain scaffolded pending full data wiring; layout still enforces session.

### 2G — Storefront
- Membership link added to header.
- Storefront product pages remain Phase 1 scaffolds (seed data path documented; no fabricated reviews/sales counts).

### 2H — Admin membership management
- `/admin/memberships` — list memberships, list invitations, create Monarch invitation form.
- All sensitive actions go through `requireMonarchInvite` + service-role helpers.

### 2I — Vercel preparation
- `.env.example` updated (distinguishes `NEXT_PUBLIC_*` vs server-only; adds optional Stripe Price IDs).
- DEPLOYMENT.md from Phase 1 remains the deployment guide (no claim of live deployment).

### 2J — Stripe subscription boundary
- `lib/integrations/stripe/subscriptions.ts` with typed stubs:
  - `createSubscriptionCheckout`, `getSubscription`, `cancelSubscription`, `changeSubscription`, `handleSubscriptionWebhook`
- Explicitly excludes Monarch from subscription checkout.
- Still throws “not implemented” until real Stripe Price IDs and webhook logic are wired.

---

## 2. Files changed / added (high level)

**Added**
- `lib/auth/actions.ts`
- `lib/validation/auth.ts` (reset schema)
- `components/auth/*` (login, signup, forgot, reset forms)
- `app/(auth)/reset-password/page.tsx`
- `supabase/migrations/0010_membership.sql`
- `lib/membership/*` (types, assign, queries, invitations, actions)
- `app/(storefront)/membership/page.tsx`
- `app/invite/[token]/page.tsx`
- `components/membership/accept-invitation-form.tsx`
- `app/admin/memberships/page.tsx`
- `components/admin/create-invitation-form.tsx`
- `lib/integrations/stripe/subscriptions.ts`
- `next-env.d.ts`
- `PHASE2_REPORT.md`

**Updated**
- `package.json` (`server-only`)
- `lib/auth/session.ts` (membershipTier)
- `lib/auth/rbac.ts` (`requireMonarchInvite`)
- `app/(auth)/login|signup|forgot-password/page.tsx`
- `app/account/page.tsx`
- `components/shared/header.tsx`
- `.env.example`

---

## 3. Database migrations

| File | Purpose |
|------|---------|
| `0010_membership.sql` | Tiers, benefits, user_memberships, history, invitations + RLS |

Apply after 0001–0009 in order.

---

## 4. Membership architecture

- **Source of truth:** `user_memberships` table (not JWT, not client state).
- **Tiers:** COMMON (default), PRO, PREMIUM (paid, Stripe), MONARCH (invitation-only).
- **Elevation paths:**
  - Signup → `ensureCommonMembership` (service role)
  - Stripe webhook (future) → `setUserMembership` for PRO/PREMIUM
  - Invitation accept → `acceptMonarchInvitation` → `setUserMembership(MONARCH)`
  - Admin grant → `adminSetMembershipAction` (requires `requireMonarchInvite`)
- **No client path** can insert/update tier (RLS + no policies for authenticated write).

---

## 5. Authentication status

| Route | Status |
|-------|--------|
| `/login` | Implemented (Server Action + form) |
| `/signup` | Implemented; forces COMMON |
| `/forgot-password` | Implemented |
| `/reset-password` | Implemented |
| Session | Middleware refresh + `getCurrentUser` |
| Sign out | Server Action |

Requires real Supabase project + env vars to exercise end-to-end.

---

## 6. Admin / RBAC changes

- `requireMonarchInvite()` added (currently = admin).
- `/admin/memberships` gated by existing admin layout (`requireAdmin`).
- Invitation create/revoke and membership grant are server actions only.

---

## 7. Stripe preparation

- Existing payment webhook + signature verification unchanged.
- New subscription boundary file with typed interfaces; all functions throw until implemented.
- Env placeholders for `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM`.
- Membership activation remains webhook-driven by design.

---

## 8. Vercel preparation

- `.env.example` documents public vs secret variables.
- No deployment claimed. Follow Phase 1 `DEPLOYMENT.md` after secrets are set.

---

## 9. Environment variables required

See `.env.example`. Critical for Phase 2:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (auth redirects, invitation links)
- Stripe keys (+ optional Price IDs when implementing subscriptions)

---

## 10. Validation commands and actual results

| Command | Result |
|---------|--------|
| `npm install` | **INCOMPLETE / TIMED OUT** — sandbox network and process limits repeatedly prevented a full install of `next` and related packages. Partial `node_modules` present. |
| `npm run typecheck` | **NOT RUN** — `tsc` / `next` not available after incomplete install. |
| `npm run lint` | **NOT RUN** — same reason. |
| `npm test` | **NOT RUN** — no test runner configured. |
| `npm run build` | **NOT RUN** — same reason. |

**Action required before treating Phase 2 as validated:** run the four commands on a normal networked machine after `npm install`, then fix any TypeScript or Next.js issues that surface.

---

## 11. Remaining blockers

1. **Full dependency install + typecheck/build** in a proper environment.
2. Apply migration `0010_membership.sql` to a real Supabase project.
3. Generate full Supabase TypeScript types (current `lib/db/types.ts` is still minimal).
4. Wire real product queries on storefront (shop, category, product) using seed data.
5. Implement remaining account sub-pages with RLS-scoped queries.
6. Implement Stripe subscription Checkout + webhook handlers for PRO/PREMIUM.
7. Confirm CJ auth against current official docs before any live calls.
8. Optional: finer-grained `MONARCH_INVITE` capability table beyond admin role.

---

## 12. Recommended next phase

1. Local validation (`npm install && npm run typecheck && npm run lint && npm run build`).
2. Link Supabase, push migrations, seed, generate types.
3. Complete storefront product listing/detail against real tables (no fabricated metrics).
4. Complete account orders/wishlist/profile/addresses with ownership checks.
5. Implement Stripe subscription Checkout + webhook → `setUserMembership` for PRO/PREMIUM only.
6. Only after the above: CJ live integration, AI Private Showroom, Monarch Private Salon.

---

**Stop condition honored:** AI Private Showroom, Monarch Private Salon, live CJ API behavior, and invented Stripe success paths were not implemented.
