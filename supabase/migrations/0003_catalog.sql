-- LÉVANCE — 0003: catalog (categories, products, variants, images, inventory)

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references categories (id) on delete set null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category_id uuid references categories (id) on delete set null,
  brand text,
  is_active boolean not null default true,
  -- Provenance: null for LÉVANCE-native products, set for CJ-sourced ones.
  cj_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on products (category_id);
create index products_cj_product_id_idx on products (cj_product_id);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  attributes jsonb not null default '{}'::jsonb, -- e.g. {"size":"M","color":"Black"}
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),
  currency text not null default 'USD',
  cj_variant_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index product_variants_product_idx on product_variants (product_id);
create index product_variants_cj_variant_id_idx on product_variants (cj_variant_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0
);

create index product_images_product_idx on product_images (product_id);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references product_variants (id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  updated_at timestamptz not null default now()
);

-- RLS: catalog is public read, admin write.
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table inventory enable row level security;

create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

create policy "products_public_read" on products for select using (is_active = true or is_admin());
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

create policy "variants_public_read" on product_variants for select using (is_active = true or is_admin());
create policy "variants_admin_write" on product_variants for all using (is_admin()) with check (is_admin());

create policy "images_public_read" on product_images for select using (true);
create policy "images_admin_write" on product_images for all using (is_admin()) with check (is_admin());

create policy "inventory_public_read" on inventory for select using (true);
create policy "inventory_admin_write" on inventory for all using (is_admin()) with check (is_admin());
