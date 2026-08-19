-- LÉVANCE — 0011: AI memory, conversations, collections, usage
-- All AI customer data is owner-scoped via RLS.

create type ai_memory_category as enum (
  'STYLE',
  'SHOPPING',
  'EXPLICIT',
  'AI_CONTEXT'
);

create type ai_memory_source as enum (
  'explicit',
  'inferred'
);

create type ai_conversation_status as enum (
  'active',
  'archived',
  'deleted'
);

-- ─── Feature / usage tracking ────────────────────────────────────────────────
create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  tokens_in integer not null default 0 check (tokens_in >= 0),
  tokens_out integer not null default 0 check (tokens_out >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on ai_usage (user_id);
create index ai_usage_created_idx on ai_usage (created_at desc);

-- ─── Structured memory ───────────────────────────────────────────────────────
create table ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category ai_memory_category not null,
  key text not null,
  value text not null,
  source ai_memory_source not null default 'explicit',
  confidence real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

create index ai_memories_user_idx on ai_memories (user_id);
create index ai_memories_category_idx on ai_memories (user_id, category);

-- ─── Conversations ───────────────────────────────────────────────────────────
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  context text not null default 'showroom', -- showroom | monarch
  status ai_conversation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_idx on ai_conversations (user_id);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx on ai_messages (conversation_id);

-- ─── AI collections ──────────────────────────────────────────────────────────
create table ai_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  source text not null default 'user', -- user | ai
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_collections_user_idx on ai_collections (user_id);

create table ai_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references ai_collections (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  sort_order integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (collection_id, product_id)
);

create index ai_collection_items_collection_idx on ai_collection_items (collection_id);

-- ─── Recently viewed (for recommendations) ───────────────────────────────────
create table product_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index product_views_user_idx on product_views (user_id, viewed_at desc);

-- ─── User AI settings ────────────────────────────────────────────────────────
create table ai_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  personalization_enabled boolean not null default true,
  memory_enabled boolean not null default true,
  voice_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table ai_usage enable row level security;
alter table ai_memories enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_collections enable row level security;
alter table ai_collection_items enable row level security;
alter table product_views enable row level security;
alter table ai_user_settings enable row level security;

-- Owner-only policies
create policy "ai_usage_owner" on ai_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_admin" on ai_usage for select using (is_admin());

create policy "ai_memories_owner" on ai_memories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_conversations_owner" on ai_conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_messages_owner" on ai_messages for all
  using (
    exists (
      select 1 from ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "ai_collections_owner" on ai_collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_collection_items_owner" on ai_collection_items for all
  using (
    exists (
      select 1 from ai_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from ai_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "product_views_owner" on product_views for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_user_settings_owner" on ai_user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
