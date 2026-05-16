-- When dispatch-scheduled flips rows from scheduled_status='scheduled' to 'live',
-- AFTER INSERT triggers (subscriber + circle notifications) do not run again.
-- Mirror notification logic on that transition.

create or replace function public.notify_creator_post_subscribers_on_schedule_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op is distinct from 'UPDATE' then
      return new;
    end if;
    if old.scheduled_status is not distinct from new.scheduled_status then
      return new;
    end if;
    if old.scheduled_status is distinct from 'scheduled' then
      return new;
    end if;
    if new.scheduled_status is distinct from 'live' then
      return new;
    end if;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
    select
      s.subscriber_id,
      new.creator_id,
      'creator_new_post',
      coalesce(nullif(trim(pr.display_name), ''), 'Someone') || ' posted new content',
      new.id::text,
      false,
      null
    from public.creator_post_subscribers s
    join public.profiles pr on pr.id = new.creator_id
    where s.creator_id = new.creator_id
      and s.subscriber_id is distinct from new.creator_id;

  exception when others then
    perform public.log_trigger_error(
      'notify_creator_post_subscribers_on_schedule_live', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_creator_post_subscribers_on_schedule_live on public.posts;
create trigger tr_notify_creator_post_subscribers_on_schedule_live
  after update of scheduled_status on public.posts
  for each row execute function public.notify_creator_post_subscribers_on_schedule_live();

comment on function public.notify_creator_post_subscribers_on_schedule_live() is
  'Fan-out creator_new_post when a scheduled row becomes live (dispatcher UPDATE); complements AFTER INSERT trigger.';

-- Circles: same transition → circle_new_post for opted-in members.

create or replace function public.notify_community_members_on_schedule_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid_text text;
begin
  begin
    if tg_op is distinct from 'UPDATE' then
      return new;
    end if;
    if old.scheduled_status is not distinct from new.scheduled_status then
      return new;
    end if;
    if old.scheduled_status is distinct from 'scheduled' then
      return new;
    end if;
    if new.scheduled_status is distinct from 'live' then
      return new;
    end if;
    if new.communities is null or cardinality(new.communities) < 1 then
      return new;
    end if;

    foreach cid_text in array new.communities
    loop
      if cid_text is null or btrim(cid_text) = '' then
        continue;
      end if;

      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      select
        cm.user_id,
        new.creator_id,
        'circle_new_post',
        'New post in a circle you joined',
        new.id::text,
        false,
        cid_text::uuid
      from public.community_members cm
      where cm.community_id = cid_text::uuid
        and cm.user_id is distinct from new.creator_id
        and cm.notify_new_posts is true;
    end loop;
  exception when others then
    perform public.log_trigger_error(
      'notify_community_members_on_schedule_live', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_community_members_on_schedule_live on public.posts;
create trigger tr_notify_community_members_on_schedule_live
  after update of scheduled_status on public.posts
  for each row execute function public.notify_community_members_on_schedule_live();

comment on function public.notify_community_members_on_schedule_live() is
  'Fan-out circle_new_post when scheduled circle post becomes live; complements AFTER INSERT trigger.';
