-- LÉVANCE — 0006: customer addresses

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text not null,
  country_code text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_idx on addresses (user_id);

alter table addresses enable row level security;

create policy "addresses_owner_rw" on addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
