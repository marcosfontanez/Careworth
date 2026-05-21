-- Phase 3 closed-beta expansion:
-- 1) Mirror economy gift push types into public.notifications (existing webhook)
-- 2) Lock _economy_user_notify to service_role callers only

-- ---------------------------------------------------------------------------
-- 1. Economy notify — mirror push-eligible types to public.notifications
-- ---------------------------------------------------------------------------
create or replace function public._economy_user_notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_target text;
  v_message text;
  v_push_types text[] := array['diamonds_earned', 'gift_sent'];
  v_gift_id uuid;
begin
  insert into public.user_notifications (user_id, type, title, body, data)
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  );

  if not (p_type = any (v_push_types)) then
    return;
  end if;

  v_message := coalesce(nullif(trim(p_body), ''), p_title);

  if p_type = 'diamonds_earned' then
    v_actor := p_user_id;
    v_target := coalesce(p_data->>'creator_gift_id', p_user_id::text);

    if p_data ? 'creator_gift_id' then
      begin
        v_gift_id := (p_data->>'creator_gift_id')::uuid;
        select cg.sender_user_id into v_actor
        from public.creator_gifts cg
        where cg.id = v_gift_id;
        v_actor := coalesce(v_actor, p_user_id);
      exception when others then
        v_actor := p_user_id;
      end;
    end if;
  elsif p_type = 'gift_sent' then
    v_actor := p_user_id;
    v_target := coalesce(p_data->>'creator_id', p_data->>'creator_gift_id', p_user_id::text);
  else
    return;
  end if;

  begin
    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (p_user_id, v_actor, p_type, v_message, v_target, false);
  exception when others then
    -- Best-effort push mirror; user_notifications row is the economy audit feed.
    null;
  end;
end;
$$;

comment on function public._economy_user_notify(uuid, text, text, text, jsonb) is
  'Economy in-app notify (user_notifications) + mirror diamonds_earned/gift_sent to public.notifications for push webhook.';

-- ---------------------------------------------------------------------------
-- 2. Security — internal notify helper must not be a client RPC
-- ---------------------------------------------------------------------------
revoke all on function public._economy_user_notify(uuid, text, text, text, jsonb) from public;
revoke all on function public._economy_user_notify(uuid, text, text, text, jsonb) from anon;
revoke all on function public._economy_user_notify(uuid, text, text, text, jsonb) from authenticated;
grant execute on function public._economy_user_notify(uuid, text, text, text, jsonb) to service_role;
