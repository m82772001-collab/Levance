-- LÉVANCE — 0007: orders, order_items, payments, shipments

create type order_status as enum (
  'pending', 'awaiting_payment', 'paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'refunded'
);

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  profile_id uuid references profiles (id) on delete set null,
  cart_id uuid references carts (id) on delete set null,
  order_number text not null unique,
  status order_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'USD',
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on orders (user_id);
create index orders_profile_idx on orders (profile_id);
create index orders_cart_idx on orders (cart_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  product_name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);

create index order_items_order_idx on order_items (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'stripe',
  provider_payment_id text not null unique,
  status payment_status not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create index payments_order_idx on payments (order_id);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  cj_order_id text,
  carrier text,
  tracking_number text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_order_idx on shipments (order_id);

alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table shipments enable row level security;

create policy "orders_owner_read" on orders for select using (auth.uid() = user_id or is_admin());
create policy "orders_admin_write" on orders for all using (is_admin()) with check (is_admin());
create policy "order_items_owner_read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "order_items_admin_write" on order_items for all using (is_admin()) with check (is_admin());
create policy "payments_owner_read" on payments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "shipments_owner_read" on shipments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "shipments_admin_write" on shipments for all using (is_admin()) with check (is_admin());
