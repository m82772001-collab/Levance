-- LÉVANCE — 0004: cart (supports both authenticated and guest carts)

create table carts (
  id uuid primary key default gen_random_uuid(),
  -- Exactly one of user_id / guest_token is set.
  user_id uuid references auth.users (id) on delete cascade,
  guest_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_owner_check check (
    (user_id is not null and guest_token is null) or
    (user_id is null and guest_token is not null)
  )
);

create unique index carts_user_id_idx on carts (user_id) where user_id is not null;
create unique index carts_guest_token_idx on carts (guest_token) where guest_token is not null;

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create index cart_items_cart_idx on cart_items (cart_id);

alter table carts enable row level security;
alter table cart_items enable row level security;

-- Authenticated users can only touch their own cart. Guest cart access
-- is mediated entirely server-side (via the guest_token cookie), never
-- directly from the browser with the anon key — see lib/db/supabase-server.ts
-- usage pattern for the cart Server Actions.
create policy "carts_owner_rw" on carts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cart_items_owner_rw" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
