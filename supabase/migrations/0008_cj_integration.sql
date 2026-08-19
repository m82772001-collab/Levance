-- LÉVANCE — 0008: CJ Dropshipping integration tables (backend-only)
--
-- These tables are never queried directly by the customer-facing
-- storefront. LÉVANCE's own products/product_variants remain the
-- source of truth for the storefront; these hold raw CJ-side data and
-- sync bookkeeping. See lib/integrations/cj/.

create table cj_products (
  cj_product_id text primary key,
  product_id uuid references products (id) on delete set null,
  raw jsonb not null,
  last_synced_at timestamptz
);

create table cj_variants (
  cj_variant_id text primary key,
  cj_product_id text not null references cj_products (cj_product_id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  raw jsonb not null,
  last_synced_at timestamptz
);

create table cj_inventory (
  cj_variant_id text primary key references cj_variants (cj_variant_id) on delete cascade,
  quantity_available integer not null default 0,
  warehouse text,
  last_synced_at timestamptz not null default now()
);

create table cj_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  cj_order_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cj_order_items (
  id uuid primary key default gen_random_uuid(),
  cj_order_id text not null references cj_orders (cj_order_id) on delete cascade,
  cj_variant_id text not null references cj_variants (cj_variant_id),
  quantity integer not null check (quantity > 0)
);

create table cj_shipments (
  id uuid primary key default gen_random_uuid(),
  cj_order_id text not null references cj_orders (cj_order_id) on delete cascade,
  carrier text,
  tracking_number text,
  status text not null default 'pending',
  updated_at timestamptz not null default now()
);

create table cj_sync_logs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null, -- 'product' | 'inventory' | 'order' | 'tracking'
  target_id text,
  status text not null, -- 'success' | 'error'
  message text,
  created_at timestamptz not null default now()
);

-- RLS: admin-only. This is purely backend/supplier data.
alter table cj_products enable row level security;
alter table cj_variants enable row level security;
alter table cj_inventory enable row level security;
alter table cj_orders enable row level security;
alter table cj_order_items enable row level security;
alter table cj_shipments enable row level security;
alter table cj_sync_logs enable row level security;

create policy "cj_products_admin" on cj_products for all using (is_admin()) with check (is_admin());
create policy "cj_variants_admin" on cj_variants for all using (is_admin()) with check (is_admin());
create policy "cj_inventory_admin" on cj_inventory for all using (is_admin()) with check (is_admin());
create policy "cj_orders_admin" on cj_orders for all using (is_admin()) with check (is_admin());
create policy "cj_order_items_admin" on cj_order_items for all using (is_admin()) with check (is_admin());
create policy "cj_shipments_admin" on cj_shipments for all using (is_admin()) with check (is_admin());
create policy "cj_sync_logs_admin" on cj_sync_logs for all using (is_admin()) with check (is_admin());
-- Note: the sync job itself runs via the service-role client (bypasses
-- RLS) — these policies only govern what an authenticated admin user
-- can see/do through the admin UI directly.
