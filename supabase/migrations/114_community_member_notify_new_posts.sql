-- Per-membership preference: notify member when new wall posts appear in this circle.
-- Used by notify_community_members_on_new_post; clients also sync local bell mute (circleExperience).

alter table public.community_members
  add column if not exists notify_new_posts boolean not null default true;

comment on column public.community_members.notify_new_posts is
  'When true (default), member receives in-app/push rows for new posts tagged with this community.';

-- ---------------------------------------------------------------------------
-- Notify joined members (except author) when a live post is tagged to the circle.
-- ---------------------------------------------------------------------------
create or replace function public.notify_community_members_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid_text text;
begin
  begin
    if coalesce(new.scheduled_status, 'live') is distinct from 'live' then
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
      'notify_community_members_on_new_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_community_members_on_new_post on public.posts;
create trigger tr_notify_community_members_on_new_post
  after insert on public.posts
  for each row execute function public.notify_community_members_on_new_post();
