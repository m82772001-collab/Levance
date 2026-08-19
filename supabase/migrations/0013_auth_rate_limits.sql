-- LÉVANCE — 0013: database-backed auth rate limiting
create table if not exists auth_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table auth_rate_limits enable row level security;

revoke all on table auth_rate_limits from anon, authenticated;

create or replace function consume_auth_rate_limit(
  p_key text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row auth_rate_limits%rowtype;
  v_allowed boolean;
begin
  select * into v_row from auth_rate_limits where key = p_key for update;

  if not found or v_now >= v_row.window_started_at + make_interval(secs => p_window_seconds) then
    insert into auth_rate_limits(key, window_started_at, attempts, updated_at)
    values (p_key, v_now, 1, v_now)
    on conflict (key) do update set
      window_started_at = excluded.window_started_at,
      attempts = 1,
      updated_at = excluded.updated_at;
    return true;
  end if;

  v_allowed := v_row.attempts < p_limit;
  update auth_rate_limits
  set attempts = attempts + 1,
      updated_at = v_now
  where key = p_key;

  return v_allowed;
end;
$$;

revoke all on function consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function consume_auth_rate_limit(text, integer, integer) to service_role;
