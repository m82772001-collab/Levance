-- LÉVANCE — 0017: multi-brand showroom catalog
-- Brands are first-class entities. Products retain their existing category/variant/image relationships.

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  description text,
  trademark_disclaimer_text text not null,
  is_authorized_reseller boolean not null default false,
  supplier_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products
  add column brand_id uuid references brands (id) on delete set null,
  add column attributes jsonb not null default '{}'::jsonb;

create index products_brand_idx on products (brand_id);
create index products_brand_category_idx on products (brand_id, category_id);
create index brands_slug_idx on brands (slug);

-- Category hierarchy remains recursive through categories.parent_id. Brand is orthogonal:
-- category (e.g. Phones) + brand (e.g. Samsung) lets the showroom browse Phones across brands
-- without duplicating the category tree. Product variants/images remain attached to products.

alter table brands enable row level security;
create policy "brands_public_read" on brands for select using (true);
create policy "brands_admin_write" on brands for all using (is_admin()) with check (is_admin());

comment on table brands is 'First-class showroom brands; only admin can create/update/delete, public can read.';
comment on column brands.trademark_disclaimer_text is 'Customer-facing third-party trademark/affiliation disclaimer; do not imply endorsement unless authorized.';
comment on column products.attributes is 'Flexible category-specific product attributes such as ISBN/author/publisher, storage/RAM, or size/color.';
