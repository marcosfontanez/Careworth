-- Migration 260 · Pulse Board shoutout rate limits (V1 hardening)
--
-- Prevents spam: 30s cooldown + 12 shoutouts/hour per author per profile.

create or replace function public.post_profile_board_shoutout(
  p_profile_owner_id uuid,
  p_body text
)
returns public.profile_board_shoutouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trimmed text;
  v_row public.profile_board_shoutouts;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'empty shoutout' using errcode = '22000';
  end if;
  if char_length(v_trimmed) > 160 then
    raise exception 'shoutout too long' using errcode = '22000';
  end if;
  if v_trimmed ~* '(https?://|www\.)' then
    raise exception 'links not allowed' using errcode = '22000';
  end if;

  if v_user = p_profile_owner_id then
    raise exception 'self shoutouts not allowed' using errcode = '22000';
  end if;

  if not public.viewer_can_read_profile_surface(p_profile_owner_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not coalesce(
    (select pr.pulse_board_enabled from public.profiles pr where pr.id = p_profile_owner_id),
    true
  ) then
    raise exception 'board disabled' using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '30 seconds'
      and s.status = 'active'
  ) then
    raise exception 'rate limited cooldown' using errcode = '22000';
  end if;

  if (
    select count(*)::int
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '1 hour'
      and s.status in ('active', 'hidden', 'reported', 'pending')
  ) >= 12 then
    raise exception 'rate limited hourly cap' using errcode = '22000';
  end if;

  insert into public.profile_board_shoutouts (profile_owner_id, author_id, body)
       values (p_profile_owner_id, v_user, v_trimmed)
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;
