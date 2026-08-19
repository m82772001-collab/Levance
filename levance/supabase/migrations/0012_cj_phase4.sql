-- LÉVANCE — 0012: CJ Phase 4 operational fields

alter table cj_orders
  add column if not exists raw jsonb,
  add column if not exists last_synced_at timestamptz,
  add column if not exists idempotency_key text;

create unique index if not exists cj_orders_order_id_uidx on cj_orders (order_id);

alter table cj_sync_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Optional pricing config note stored on product for audit (not required for sell)
alter table products
  add column if not exists supplier_cost_cents integer;

comment on column cj_orders.idempotency_key is 'Optional key to prevent duplicate CJ submissions';
