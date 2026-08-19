-- LÉVANCE — 0015: harden membership security-definer helper
revoke execute on function public.get_user_membership_tier(uuid) from public;
revoke execute on function public.get_user_membership_tier(uuid) from anon;
revoke execute on function public.get_user_membership_tier(uuid) from authenticated;
grant execute on function public.get_user_membership_tier(uuid) to service_role;
