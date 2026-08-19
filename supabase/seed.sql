-- LÉVANCE — development seed data
-- CLEARLY MARKED AS DEV DATA. Never run this against a production
-- database. Product names are prefixed "[DEV]" so they can never be
-- mistaken for real catalogue/sales data.

insert into categories (slug, name) values
  ('fashion', 'Fashion'),
  ('beauty', 'Beauty'),
  ('tech', 'Tech'),
  ('accessories', 'Accessories'),
  ('home', 'Home'),
  ('lifestyle', 'Lifestyle')
on conflict (slug) do nothing;

with cat as (select id from categories where slug = 'accessories')
insert into products (slug, name, description, category_id, brand, is_active)
select '[dev]-obsidian-leather-tote', '[DEV] Obsidian Leather Tote',
       'Seed product for local development only — not real inventory.',
       cat.id, 'LÉVANCE', true
from cat
on conflict (slug) do nothing;

with p as (select id from products where slug = '[dev]-obsidian-leather-tote')
insert into product_variants (product_id, sku, attributes, price_cents, compare_at_price_cents, currency)
select p.id, '[DEV]-TOTE-BLK-OS', '{"color":"Black"}'::jsonb, 24000, 29000, 'USD'
from p
on conflict (sku) do nothing;

with v as (select id from product_variants where sku = '[DEV]-TOTE-BLK-OS')
insert into inventory (variant_id, quantity_available)
select v.id, 25 from v
on conflict (variant_id) do nothing;
