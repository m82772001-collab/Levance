# Deployment & Validation

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local — see INTEGRATIONS.md for what each var is and where to get it
```

## Database

1. Create a Supabase project (or use the Supabase CLI to run one locally).
2. Apply migrations in order:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   or paste each file in `supabase/migrations/` into the SQL editor, in
   filename order, if not using the CLI.
3. (Optional, dev/staging only) `psql < supabase/seed.sql` or paste into
   the SQL editor — never run against production.

## Validation checklist (run all four before trusting the build)

This project was scaffolded in a sandboxed environment with no network
access, so none of these have been run yet — do this first:

```bash
npm install         # installs everything in package.json
npm run typecheck    # tsc --noEmit — strict mode, should report 0 errors
npm run lint          # ESLint
npm run build          # production build — confirms routing, RSC boundaries, etc. actually compile
```

If `npm run typecheck` or `npm run build` fail, treat that as a real
finding, not a sandbox artifact — the code was hand-written, not
generated from a working `npm install`, so first-run errors (a missed
import, a Next.js 15 App Router API change, etc.) are plausible. Fix them
before building further phases on top.

## Vercel

1. Import the repo into Vercel.
2. Set every variable from `.env.example` in the Vercel project's
   Environment Variables settings (Production + Preview as needed) — with
   real values, never the placeholders.
3. Point the Stripe webhook (once implemented) at
   `https://<your-domain>/api/stripe/webhook` and set
   `STRIPE_WEBHOOK_SECRET` to the signing secret Stripe gives you for that
   endpoint.
4. Deploy.

## Before claiming any phase "done"

Per the spec's own rule: a page existing, or a status label showing
"Connected," is not evidence of function. Before marking Stripe, CJ,
auth, or any admin capability complete, it needs to have actually been
exercised — a real login, a real webhook delivery (Stripe CLI's
`stripe listen --forward-to` is useful for this locally), a real RLS
denial test (try to read another user's row and confirm it's blocked).
