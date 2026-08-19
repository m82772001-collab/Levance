-- LÉVANCE — 0014: Stripe payment references on orders
alter table orders
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists stripe_payment_intent_id text unique;

create index if not exists orders_stripe_checkout_session_idx
  on orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists orders_stripe_payment_intent_idx
  on orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
