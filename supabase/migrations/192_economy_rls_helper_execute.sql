-- Fix shop/wallet RLS after migration 177:
-- Policies on shop_items, spark_wallets, diamond_wallets, etc. call
-- public._economy_is_admin(). PostgreSQL requires EXECUTE on functions
-- referenced in RLS expressions. Migration 177 revoked all leading-underscore
-- helpers from anon/authenticated, which broke catalog + wallet reads with:
--   permission denied for function _economy_is_admin

grant execute on function public._economy_is_admin() to anon, authenticated;

comment on function public._economy_is_admin() is
  'Internal admin check for economy RLS and SECURITY DEFINER RPCs. EXECUTE granted to anon/authenticated so RLS policies can evaluate; not a public product API.';
