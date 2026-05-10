-- Opt-in: notify subscribers when a creator publishes a new live post (in-app + push via notifications webhook).

create table public.creator_post_subscribers (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, creator_id),
  constraint creator_post_subscribers_no_self check (subscriber_id <> creator_id)
);

create index idx_creator_post_subscribers_creator
  on public.creator_post_subscribers (creator_id);

alter table public.creator_post_subscribers enable row level security;

create policy "creator_post_subscribers_select_own"
  on public.creator_post_subscribers for select
  using (auth.uid() = subscriber_id);

create policy "creator_post_subscribers_insert_own"
  on public.creator_post_subscribers for insert
  with check (auth.uid() = subscriber_id);

create policy "creator_post_subscribers_delete_own"
  on public.creator_post_subscribers for delete
  using (auth.uid() = subscriber_id);

comment on table public.creator_post_subscribers is
  'Viewer (subscriber_id) receives notifications when creator_id publishes a new live post.';

create or replace function public.notify_creator_post_subscribers_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if coalesce(new.scheduled_status, 'live') is distinct from 'live' then
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
      'notify_creator_post_subscribers_on_new_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_creator_post_subscribers_on_new_post on public.posts;
create trigger tr_notify_creator_post_subscribers_on_new_post
  after insert on public.posts
  for each row execute function public.notify_creator_post_subscribers_on_new_post();
