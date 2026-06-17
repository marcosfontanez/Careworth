-- Notify reply authors when someone marks their Circle reply Helpful (insert-only, no spam on remove).

create or replace function public.notify_on_circle_reply_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reply_author uuid;
  v_thread_id uuid;
  v_community_id uuid;
  v_reply_status text;
  v_thread_status text;
  v_thread_deleted timestamptz;
  v_redact_actor boolean;
  v_actor_id uuid;
  v_actor_name text;
  v_message text;
begin
  if tg_op <> 'INSERT' or new.reaction_type <> 'helpful' then
    return new;
  end if;

  begin
    select
      cr.author_id,
      cr.thread_id,
      t.community_id,
      cr.moderation_status,
      t.moderation_status,
      t.deleted_at
    into
      v_reply_author,
      v_thread_id,
      v_community_id,
      v_reply_status,
      v_thread_status,
      v_thread_deleted
    from public.circle_replies cr
    join public.circle_threads t on t.id = cr.thread_id
    where cr.id = new.reply_id;

    if v_reply_author is null or v_community_id is null then
      return new;
    end if;

    if v_reply_author = new.user_id then
      return new;
    end if;

    if coalesce(v_reply_status, 'active') <> 'active' then
      return new;
    end if;

    if coalesce(v_thread_status, 'active') <> 'active' then
      return new;
    end if;

    if v_thread_deleted is not null then
      return new;
    end if;

    if exists (
      select 1
      from public.blocked_users bu
      where (
        bu.blocker_id = new.user_id and bu.blocked_id = v_reply_author
      ) or (
        bu.blocker_id = v_reply_author and bu.blocked_id = new.user_id
      )
    ) then
      return new;
    end if;

    v_redact_actor := public.community_is_confessions(v_community_id);
    v_actor_id := case when v_redact_actor then null else new.user_id end;

    if v_redact_actor then
      v_message := 'Someone found your reply helpful.';
    else
      select coalesce(
        nullif(trim(p.display_name), ''),
        nullif(trim(p.username), ''),
        'Someone'
      )
        into v_actor_name
      from public.profiles p
      where p.id = new.user_id;

      v_message := coalesce(v_actor_name, 'Someone') || ' found your reply helpful.';
    end if;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
    values (
      v_reply_author,
      v_actor_id,
      'circle_reply_helpful',
      v_message,
      v_thread_id::text,
      false,
      v_community_id
    );
  exception when others then
    perform public.log_trigger_error(
      'notify_on_circle_reply_helpful',
      tg_op,
      tg_table_name,
      sqlstate,
      sqlerrm,
      jsonb_build_object('reply_id', new.reply_id, 'reactor_id', new.user_id)
    );
  end;

  return new;
end;
$$;

drop trigger if exists trg_circle_reply_reactions_notify_helpful on public.circle_reply_reactions;
create trigger trg_circle_reply_reactions_notify_helpful
  after insert on public.circle_reply_reactions
  for each row execute function public.notify_on_circle_reply_helpful();

comment on function public.notify_on_circle_reply_helpful() is
  'Fires once per new Helpful reaction; skips self, blocks, inactive/deleted content, and Confessions identity.';

revoke all on function public.notify_on_circle_reply_helpful() from public;
