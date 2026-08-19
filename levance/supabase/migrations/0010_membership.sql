-- LÉVANCE — 0010: Membership tiers, user memberships, history, benefits, invitations
--
-- Database is the authoritative source of membership.
-- MONARCH is invitation-only and must never be publicly purchasable.

-- Controlled tier enum
create type membership_tier as enum ('COMMON', 'PRO', 'PREMIUM', 'MONARCH');

create type membership_status as enum (
  'active',
  'past_due',
  'cancelled',
  'expired',
  'pending'
);

create type invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

-- ─── membership_tiers (reference / display config) ───────────────────────────
create table membership_tiers (
  id uuid primary key default gen_random_uuid(),
  tier membership_tier not null unique,
  name text not null,
  description text,
  is_paid boolean not null default false,
  is_publicly_purchasable boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Guard: MONARCH can never be publicly purchasable
  constraint monarch_not_purchasable check (
    tier <> 'MONARCH' or is_publicly_purchasable = false
  )
);

insert into membership_tiers (tier, name, description, is_paid, is_publicly_purchasable, sort_order)
values
  ('COMMON',  'Common',  'Your LÉVANCE experience starts here.',           false, false, 1),
  ('PRO',     'Pro',     'More access. More advantages.',                  true,  true,  2),
  ('PREMIUM', 'Premium', 'An elevated LÉVANCE experience.',                true,  true,  3),
  ('MONARCH', 'Monarch', 'Reserved for those personally invited.',         false, false, 4);

-- ─── membership_benefits ─────────────────────────────────────────────────────
create table membership_benefits (
  id uuid primary key default gen_random_uuid(),
  tier membership_tier not null references membership_tiers (tier) on delete cascade,
  key text not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tier, key)
);

insert into membership_benefits (tier, key, label, description, sort_order) values
  ('COMMON',  'browse',       'Browse the collection',     'Full access to the LÉVANCE catalogue.', 1),
  ('COMMON',  'wishlist',     'Wishlist',                  'Save pieces you love.', 2),
  ('PRO',     'browse',       'Browse the collection',     'Full access to the LÉVANCE catalogue.', 1),
  ('PRO',     'wishlist',     'Wishlist',                  'Save pieces you love.', 2),
  ('PRO',     'early_access', 'Early access',              'Shop new arrivals before the public.', 3),
  ('PRO',     'member_price', 'Member pricing',            'Selected pieces at member rates.', 4),
  ('PREMIUM', 'browse',       'Browse the collection',     'Full access to the LÉVANCE catalogue.', 1),
  ('PREMIUM', 'wishlist',     'Wishlist',                  'Save pieces you love.', 2),
  ('PREMIUM', 'early_access', 'Early access',              'Shop new arrivals before the public.', 3),
  ('PREMIUM', 'member_price', 'Member pricing',            'Selected pieces at member rates.', 4),
  ('PREMIUM', 'priority',     'Priority support',          'Dedicated customer care.', 5),
  ('PREMIUM', 'exclusive',    'Exclusive drops',           'Access to limited Premium releases.', 6),
  ('MONARCH', 'browse',       'Browse the collection',     'Full access to the LÉVANCE catalogue.', 1),
  ('MONARCH', 'wishlist',     'Wishlist',                  'Save pieces you love.', 2),
  ('MONARCH', 'early_access', 'Early access',              'Shop new arrivals before the public.', 3),
  ('MONARCH', 'member_price', 'Member pricing',            'Selected pieces at member rates.', 4),
  ('MONARCH', 'priority',     'Priority support',          'Dedicated customer care.', 5),
  ('MONARCH', 'exclusive',    'Exclusive drops',           'Access to limited releases.', 6),
  ('MONARCH', 'invite_only',  'Invitation-only status',    'Reserved for those personally invited by the founder.', 7);

-- ─── user_memberships (authoritative current membership) ─────────────────────
create table user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  tier membership_tier not null default 'COMMON',
  status membership_status not null default 'active',
  -- Stripe fields (populated only for paid tiers; never for MONARCH via public checkout)
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  -- Invitation linkage for MONARCH
  invitation_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_memberships_tier_idx on user_memberships (tier);
create index user_memberships_stripe_customer_idx on user_memberships (stripe_customer_id)
  where stripe_customer_id is not null;
create index user_memberships_stripe_subscription_idx on user_memberships (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ─── membership_history (audit trail) ────────────────────────────────────────
create table membership_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_tier membership_tier,
  to_tier membership_tier not null,
  from_status membership_status,
  to_status membership_status not null,
  reason text,
  actor_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index membership_history_user_idx on membership_history (user_id);
create index membership_history_created_idx on membership_history (created_at desc);

-- ─── membership_invitations (MONARCH only) ───────────────────────────────────
-- Store only token_hash — never the raw token.
create table membership_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text, -- optional restriction; null = any authenticated user can accept
  tier membership_tier not null default 'MONARCH',
  status invitation_status not null default 'pending',
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only MONARCH invitations are supported in this system
  constraint invitation_tier_monarch check (tier = 'MONARCH')
);

create index membership_invitations_status_idx on membership_invitations (status);
create index membership_invitations_email_idx on membership_invitations (email)
  where email is not null;
create index membership_invitations_expires_idx on membership_invitations (expires_at);

-- Link invitation_id after table exists
alter table user_memberships
  add constraint user_memberships_invitation_fk
  foreign key (invitation_id) references membership_invitations (id) on delete set null;

-- ─── Helper: current membership for a user ───────────────────────────────────
create or replace function public.get_user_membership_tier(p_user_id uuid)
returns membership_tier
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select tier from user_memberships where user_id = p_user_id and status = 'active' limit 1),
    'COMMON'::membership_tier
  );
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table membership_tiers enable row level security;
alter table membership_benefits enable row level security;
alter table user_memberships enable row level security;
alter table membership_history enable row level security;
alter table membership_invitations enable row level security;

-- Tiers & benefits: public read (needed for /membership page)
create policy "membership_tiers_public_read"
  on membership_tiers for select using (true);
create policy "membership_tiers_admin_write"
  on membership_tiers for all using (is_admin()) with check (is_admin());

create policy "membership_benefits_public_read"
  on membership_benefits for select using (true);
create policy "membership_benefits_admin_write"
  on membership_benefits for all using (is_admin()) with check (is_admin());

-- User memberships: owner read, admin full, no client insert/update of tier
create policy "user_memberships_select_own"
  on user_memberships for select
  using (auth.uid() = user_id or is_admin());

-- No insert/update policies for authenticated users on tier-changing columns.
-- Service role (webhooks, invitation acceptance) and admin use service-role or
-- security-definer functions. This prevents clients from elevating themselves.
create policy "user_memberships_admin_all"
  on user_memberships for all
  using (is_admin()) with check (is_admin());

-- History: owner read, admin read/write
create policy "membership_history_select_own"
  on membership_history for select
  using (auth.uid() = user_id or is_admin());

create policy "membership_history_admin_all"
  on membership_history for all
  using (is_admin()) with check (is_admin());

-- Invitations: only creator or admin can see/manage; acceptance happens via
-- security-definer function that validates token_hash.
create policy "membership_invitations_select_admin"
  on membership_invitations for select
  using (is_admin() or auth.uid() = created_by);

create policy "membership_invitations_admin_write"
  on membership_invitations for all
  using (is_admin()) with check (is_admin());
