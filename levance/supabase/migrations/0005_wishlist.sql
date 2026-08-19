-- LÉVANCE — 0005: wishlist

create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references wishlists (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

alter table wishlists enable row level security;
alter table wishlist_items enable row level security;

create policy "wishlists_owner_rw" on wishlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wishlist_items_owner_rw" on wishlist_items for all
  using (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));
