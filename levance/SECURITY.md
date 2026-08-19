# Security

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `CJ_API_KEY`, `CJ_API_SECRET`, `CJ_ACCESS_TOKEN` are server-only. Every
  module that touches one is marked with the `server-only` import, which
  fails the build if accidentally pulled into a client bundle.
- `.env.local` is gitignored. `.env.example` contains placeholders only —
  never fill it with real values.
- No secret is ever logged. Webhook handlers log the error object on
  failure but return a generic message to the caller
  (`app/api/stripe/webhook/route.ts`).

## Defense in depth (three independent layers)

1. **Middleware** (`middleware.ts`) — coarse redirect for unauthenticated
   `/account` and `/admin` access. UX convenience only; documented as not
   being the actual security boundary so it's never mistaken for one.
2. **Server-side authorization** (`lib/auth/rbac.ts`) — `requireAdmin()` /
   `requireUser()` re-check the session and role from the database on
   every admin layout render and must be called in every admin server
   action.
3. **Row Level Security** (`supabase/migrations/`) — enforced at the
   database layer regardless of what the application code does. A bug or
   missing check in (1) or (2) still can't expose another user's data or
   let a non-admin write to admin-only tables.

## Payment integrity

`payments` rows can only be written by the Supabase service-role client,
and that client is only invoked from the signature-verified Stripe
webhook handler. There is no RLS policy — for any role — permitting an
insert or update on `payments` from the anon-key path. A frontend
"success" redirect is explicitly never treated as proof of payment (see
`INTEGRATIONS.md`).

## Admin status accuracy

The admin Integrations page (`app/admin/integrations/page.tsx`) reports
Stripe/CJ connection status by checking whether the actual required
environment variables are set (`isStripeConfigured()`, `isCjConfigured()`)
— never a hard-coded "Connected" label. The same principle applies to any
future "Synced" / "Paid" / "Tracking available" UI: it must reflect
verified backend state, not the mere existence of a UI element.

## Input validation

All user-supplied input that reaches the database goes through a Zod
schema in `lib/validation/` before use. `products` filter, login, signup,
and forgot-password flows already have schemas; extend this pattern for
every new form/server action rather than validating ad hoc.

## Error handling

Route handlers (see the Stripe webhook) catch and log internally, but
return generic error messages — no stack traces, no internal identifiers,
no database error text — to the client.

## What's NOT yet covered (be aware before going live)

Rate limiting, CSRF considerations beyond Next.js/Supabase defaults, audit
logging beyond `payments.raw_event` and `cj_sync_logs`, dependency
vulnerability scanning, and a penetration test. None of these are
implemented in Phase 1 and should be addressed before real customer
traffic per the spec's own "do not claim production-ready" rule.
