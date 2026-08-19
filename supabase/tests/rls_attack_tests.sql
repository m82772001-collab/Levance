-- LÉVANCE RLS attack-test harness.
-- Run against a non-production database with two real auth user UUIDs:
--   psql ... -v user_a='...' -v user_b='...'
-- The transaction is rolled back, so fixture rows are not retained.
-- This deliberately runs as the authenticated role so RLS, not the
-- postgres/service role, is being exercised.

begin;

-- Sanity check: every application table added in migrations 0005+ must have RLS.
select relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'wishlists','wishlist_items','addresses','orders','order_items','payments','shipments',
    'cj_products','cj_variants','cj_inventory','cj_orders','cj_order_items','cj_shipments','cj_sync_logs','cj_webhook_events',
    'reviews','coupons','membership_tiers','membership_benefits','user_memberships','membership_history','membership_invitations',
    'ai_usage','ai_memories','ai_conversations','ai_messages','ai_collections','ai_collection_items','product_views','ai_user_settings'
  )
  and relrowsecurity = false;
-- Expected: zero rows.

-- The following negative checks are intended to be run with user B's JWT
-- while attempting to read/write rows owned by user A. Each statement must
-- return zero rows or an RLS violation, never user A's data.
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Owner-scoped read/write surfaces.
select id from profiles where id = :'user_a';
select id from addresses where user_id = :'user_a';
select id from wishlists where user_id = :'user_a';
select id from orders where user_id = :'user_a';
select id from user_memberships where user_id = :'user_a';
select id from membership_history where user_id = :'user_a';
select id from ai_memories where user_id = :'user_a';
select id from ai_conversations where user_id = :'user_a';
select id from ai_collections where user_id = :'user_a';
select id from product_views where user_id = :'user_a';
select user_id from ai_user_settings where user_id = :'user_a';

-- Explicit cross-user inserts must fail RLS WITH CHECK.
insert into addresses (user_id, full_name, line1, city, postal_code, country_code)
values (:'user_a', 'RLS attack', 'x', 'x', 'x', 'US');

insert into ai_memories (user_id, category, key, value)
values (:'user_a', 'STYLE', 'rls_attack', 'must_not_write');

rollback;
