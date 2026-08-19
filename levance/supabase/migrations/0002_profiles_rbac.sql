-- LÉVANCE — 0002: profiles + RBAC foundation

create type user_role as enum ('customer', 'admin');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;

-- Customers can read/update their own profile only.
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));
  -- Note: prevents a customer from granting themselves admin via update.

-- Admins can read every profile (for the customers admin view).
create policy "profiles_select_admin"
  on profiles for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Helper used throughout later migrations' RLS policies.
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;
