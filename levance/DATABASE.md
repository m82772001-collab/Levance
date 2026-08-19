# Database

Postgres via Supabase. Migrations live in `supabase/migrations/`, applied in
filename order. Every table has RLS enabled the same migration it's created
in — there's no separate "add RLS later" step.

## Migration order

| File | Contents |
|---|---|
| `0001_init_extensions.sql` | `pgcrypto` for `gen_random_uuid()` |
| `0002_profiles_rbac.sql` | `profiles`, `user_role` enum, `is_admin()` helper, new-user trigger |
| `0003_catalog.sql` | `categories`, `products`, `product_variants`, `product_images`, `inventory` |
| `0004_cart.sql` | `carts`, `cart_items` (auth + guest support) |
| `0005_wishlist.sql` | `wishlists`, `wishlist_items` |
| `0006_addresses.sql` | `addresses` |
| `0007_orders.sql` | `orders`, `order_items`, `payments`, `shipments`, status enums |
| `0008_cj_integration.sql` | `cj_products`, `cj_variants`, `cj_inventory`, `cj_orders`, `cj_order_items`, `cj_shipments`, `cj_sync_logs` |
| `0009_reviews_coupons.sql` | `reviews`, `coupons` |

## Entity relationships (high level)

```
auth.users ─1:1─ profiles
profiles ─1:1─ carts / wishlists          (nullable for guests)
categories ─1:N─ products ─1:N─ product_variants ─1:1─ inventory
products ─1:N─ product_images
products ─1:N─ reviews ─N:1─ auth.users
carts ─1:N─ cart_items ─N:1─ product_variants
orders ─1:N─ order_items ─N:1─ product_variants
orders ─1:N─ payments
orders ─1:N─ shipments
orders ─1:1(0..1)─ cj_orders ─1:N─ cj_order_items / cj_shipments
cj_products ─0:1─ products         (mapping, backend-only)
cj_variants ─0:1─ product_variants (mapping, backend-only)
```

## RLS strategy

Three patterns, applied consistently:

1. **Public read, admin write** — `categories`, `products`, `product_variants`,
   `product_images`, `inventory`. Inactive products/variants are hidden from
   non-admins.
2. **Owner read/write, admin override** — `carts`, `cart_items`, `wishlists`,
   `wishlist_items`, `addresses`, `reviews` (insert/update), `orders` /
   `order_items` / `shipments` (read only for the owner; admin has full
   access).
3. **Admin/service-role only** — `cj_*` tables, `coupons`, and critically
   `payments`: there is **no** RLS policy allowing any authenticated
   user — customer or admin-via-anon-key — to insert or update a payment
   row. Only the service-role client can, and it's only ever invoked from
   the verified Stripe webhook handler.

`is_admin()` is a `security definer` SQL function (defined in
`0002_profiles_rbac.sql`) that checks `profiles.role = 'admin'` for
`auth.uid()`. Every admin-facing policy calls it rather than duplicating
the subquery, so the admin definition only needs to change in one place.

## Guest carts

`carts.user_id` and `carts.guest_token` are mutually exclusive via a check
constraint. RLS only grants access to `user_id`-owned rows — guest cart
reads/writes go through server-side code using the anon key but validating
the guest token from a signed cookie, not through a browser-issued RLS
policy, since RLS has no way to authenticate a guest token in isolation
without accidentally allowing enumeration.

## Seed strategy

`supabase/seed.sql` contains **development-only** data, every product name
prefixed `[DEV]`, and is meant to be run against a local or staging
Supabase project — never production. Nothing in this repo auto-runs seed
data on deploy.

## Audit considerations

- `payments.raw_event` stores the full Stripe event payload for audit/
  reconciliation.
- `cj_sync_logs` records every product/inventory/order/tracking sync
  attempt with success/error status — needed once CJ sync jobs run on a
  schedule, so failures are diagnosable without re-triggering CJ calls.
- Timestamps (`created_at` / `updated_at`) are on every mutable table.
