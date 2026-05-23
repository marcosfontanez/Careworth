-- Fix profile updates (e.g. Current Vibe song save) after migration 177.
-- profiles_username_shape_chk evaluates is_valid_username(username) on every UPDATE,
-- not only when username changes. Migration 177 revoked blanket EXECUTE without
-- re-granting this helper; authenticated callers then get "permission denied".

grant execute on function public.is_valid_username(text) to authenticated, anon;

comment on function public.is_valid_username(text) is
  '3–30 chars, lowercase, a-z 0-9 . _ only, cannot start/end with dot/underscore, no consecutive dots. EXECUTE granted for profiles CHECK + check_username_available.';
