-- Migration 261 · Pulse Board pin + owner notification (Phase 2B)
--
-- 1. Owner pin/unpin (single active pin per board via pinned_at)
-- 2. Notify profile owner when a visitor leaves a shoutout

-- ---------------------------------------------------------------------------
-- 1. post_profile_board_shoutout — owner notification after successful insert
-- ---------------------------------------------------------------------------
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
  v_actor_name text;
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

  begin
    select coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.username), ''),
      'Someone'
    )
      into v_actor_name
    from public.profiles p
    where p.id = v_user;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      p_profile_owner_id,
      v_user,
      'pulse_board_shoutout',
      coalesce(v_actor_name, 'Someone') || ' left a Pulse on your board.',
      'pulse_board:' || p_profile_owner_id::text,
      false
    );
  exception when others then
    perform public.log_trigger_error(
      'post_profile_board_shoutout_notify',
      'INSERT',
      'profile_board_shoutouts',
      sqlstate,
      sqlerrm,
      jsonb_build_object(
        'profile_owner_id', p_profile_owner_id,
        'shoutout_id', v_row.id,
        'author_id', v_user
      )
    );
  end;

  return v_row;
end;
$$;

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. moderate_profile_board_shoutout — pin / unpin (owner/staff)
-- ---------------------------------------------------------------------------
create or replace function public.moderate_profile_board_shoutout(
  p_shoutout_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.profile_board_shoutouts;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_row
    from public.profile_board_shoutouts
   where id = p_shoutout_id;

  if v_row.id is null then
    raise exception 'shoutout not found' using errcode = '22000';
  end if;

  if v_action = 'author_delete' then
    if v_row.author_id <> v_user then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now(), hidden_at = null, pinned_at = null
     where id = p_shoutout_id;
    return;
  end if;

  if v_row.profile_owner_id <> v_user and not public.viewer_is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_action = 'hide' then
    update public.profile_board_shoutouts
       set status = 'hidden', hidden_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'delete' then
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'report' then
    update public.profile_board_shoutouts
       set status = 'reported', reported_at = now(), pinned_at = null
     where id = p_shoutout_id;
  elsif v_action = 'pin' then
    if v_row.status <> 'active' or v_row.deleted_at is not null or v_row.hidden_at is not null then
      raise exception 'shoutout not found' using errcode = '22000';
    end if;
    update public.profile_board_shoutouts
       set pinned_at = null
     where profile_owner_id = v_row.profile_owner_id
       and pinned_at is not null
       and id <> p_shoutout_id;
    update public.profile_board_shoutouts
       set pinned_at = now()
     where id = p_shoutout_id;
  elsif v_action = 'unpin' then
    update public.profile_board_shoutouts
       set pinned_at = null
     where id = p_shoutout_id
       and profile_owner_id = v_row.profile_owner_id;
  else
    raise exception 'invalid action' using errcode = '22000';
  end if;
end;
$$;

grant execute on function public.moderate_profile_board_shoutout(uuid, text) to authenticated;
