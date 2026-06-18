-- 271: Signup handle check must see all profile rows (RLS-safe), not fail open/closed for anon.
-- check_username_available is called before auth; SECURITY DEFINER avoids RLS blind spots.

create or replace function public.check_username_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c text;
begin
  c := lower(trim(coalesce(candidate, '')));
  if not public.is_valid_username(c) then
    return false;
  end if;
  if not public.username_passes_content_policy(c) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = c);
end;
$$;

revoke all on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon, authenticated;

comment on function public.check_username_available(text) is
  'Pre-signup @handle availability. SECURITY DEFINER so uniqueness check is authoritative for anon clients.';
