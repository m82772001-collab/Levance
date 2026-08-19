-- LÉVANCE — 0016: CJ webhook event log
create table cj_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  status text not null default 'received',
  error text,
  created_at timestamptz not null default now()
);

create index cj_webhook_events_type_idx on cj_webhook_events (event_type);
create index cj_webhook_events_status_idx on cj_webhook_events (status);

alter table cj_webhook_events enable row level security;

create policy "cj_webhook_events_admin"
  on cj_webhook_events for all
  using (is_admin()) with check (is_admin());
