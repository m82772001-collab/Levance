-- LÉVANCE — 0013: voice assistant memory, trend snapshots, 3D product models
-- Applied to the connected Supabase project as migration ai_voice_trends_3d.

create table if not exists public.assistant_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  memory_value text not null,
  source text not null default 'explicit' check (source in ('explicit','inferred','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, memory_key)
);

create index if not exists assistant_memory_user_idx on public.assistant_memory(user_id);
alter table public.assistant_memory enable row level security;
drop policy if exists assistant_memory_owner on public.assistant_memory;
create policy assistant_memory_owner on public.assistant_memory for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  captured_at timestamptz not null default now(),
  terms jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trend_snapshots_captured_idx
  on public.trend_snapshots(captured_at desc);
alter table public.trend_snapshots enable row level security;
drop policy if exists trend_snapshots_admin_read on public.trend_snapshots;
create policy trend_snapshots_admin_read on public.trend_snapshots
  for select using (is_admin());
drop policy if exists trend_snapshots_admin_write on public.trend_snapshots;
create policy trend_snapshots_admin_write on public.trend_snapshots
  for all using (is_admin()) with check (is_admin());

alter table public.products add column if not exists model_url text;
create index if not exists products_model_url_idx
  on public.products(model_url) where model_url is not null;
