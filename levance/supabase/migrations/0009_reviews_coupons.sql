-- LÉVANCE — 0009: reviews, coupons

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index reviews_product_idx on reviews (product_id);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off smallint check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint coupon_discount_type_check check (
    (percent_off is not null and amount_off_cents is null) or
    (percent_off is null and amount_off_cents is not null)
  )
);

alter table reviews enable row level security;
alter table coupons enable row level security;

create policy "reviews_public_read" on reviews for select using (is_published = true or is_admin());
create policy "reviews_owner_write" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_owner_update" on reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_admin_moderate" on reviews for all using (is_admin()) with check (is_admin());

-- Coupons: validated server-side at checkout only; not publicly listable.
create policy "coupons_admin_all" on coupons for all using (is_admin()) with check (is_admin());
