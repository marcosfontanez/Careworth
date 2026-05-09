-- Multi-emoji reactions on posts (circle wall + anywhere `post_likes` is used).
-- One row per (user_id, post_id) with a `reaction` token; denormalised per-kind
-- counts on `posts` for fast list render. `like_count` remains total reactors.

alter table public.post_likes
  add column if not exists reaction text not null default 'heart';

alter table public.post_likes
  drop constraint if exists post_likes_reaction_check;

alter table public.post_likes
  add constraint post_likes_reaction_check
  check (reaction in ('heart', 'haha', 'wow', 'sad', 'angry', 'clap'));

alter table public.posts add column if not exists reaction_heart_count int not null default 0;
alter table public.posts add column if not exists reaction_haha_count int not null default 0;
alter table public.posts add column if not exists reaction_wow_count int not null default 0;
alter table public.posts add column if not exists reaction_sad_count int not null default 0;
alter table public.posts add column if not exists reaction_angry_count int not null default 0;
alter table public.posts add column if not exists reaction_clap_count int not null default 0;

-- Historical likes are all treated as heart.
update public.posts p
set
  reaction_heart_count = coalesce(p.like_count, 0),
  reaction_haha_count = 0,
  reaction_wow_count = 0,
  reaction_sad_count = 0,
  reaction_angry_count = 0,
  reaction_clap_count = 0;

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.posts set
        like_count = like_count + 1,
        reaction_heart_count = reaction_heart_count + (case when new.reaction = 'heart' then 1 else 0 end),
        reaction_haha_count = reaction_haha_count + (case when new.reaction = 'haha' then 1 else 0 end),
        reaction_wow_count = reaction_wow_count + (case when new.reaction = 'wow' then 1 else 0 end),
        reaction_sad_count = reaction_sad_count + (case when new.reaction = 'sad' then 1 else 0 end),
        reaction_angry_count = reaction_angry_count + (case when new.reaction = 'angry' then 1 else 0 end),
        reaction_clap_count = reaction_clap_count + (case when new.reaction = 'clap' then 1 else 0 end)
      where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set
        like_count = greatest(0, like_count - 1),
        reaction_heart_count = greatest(0, reaction_heart_count - (case when old.reaction = 'heart' then 1 else 0 end)),
        reaction_haha_count = greatest(0, reaction_haha_count - (case when old.reaction = 'haha' then 1 else 0 end)),
        reaction_wow_count = greatest(0, reaction_wow_count - (case when old.reaction = 'wow' then 1 else 0 end)),
        reaction_sad_count = greatest(0, reaction_sad_count - (case when old.reaction = 'sad' then 1 else 0 end)),
        reaction_angry_count = greatest(0, reaction_angry_count - (case when old.reaction = 'angry' then 1 else 0 end)),
        reaction_clap_count = greatest(0, reaction_clap_count - (case when old.reaction = 'clap' then 1 else 0 end))
      where id = old.post_id;
    elsif tg_op = 'UPDATE' then
      if old.reaction is distinct from new.reaction then
        update public.posts set
          reaction_heart_count = greatest(0, reaction_heart_count
            - (case when old.reaction = 'heart' then 1 else 0 end)
            + (case when new.reaction = 'heart' then 1 else 0 end)),
          reaction_haha_count = greatest(0, reaction_haha_count
            - (case when old.reaction = 'haha' then 1 else 0 end)
            + (case when new.reaction = 'haha' then 1 else 0 end)),
          reaction_wow_count = greatest(0, reaction_wow_count
            - (case when old.reaction = 'wow' then 1 else 0 end)
            + (case when new.reaction = 'wow' then 1 else 0 end)),
          reaction_sad_count = greatest(0, reaction_sad_count
            - (case when old.reaction = 'sad' then 1 else 0 end)
            + (case when new.reaction = 'sad' then 1 else 0 end)),
          reaction_angry_count = greatest(0, reaction_angry_count
            - (case when old.reaction = 'angry' then 1 else 0 end)
            + (case when new.reaction = 'angry' then 1 else 0 end)),
          reaction_clap_count = greatest(0, reaction_clap_count
            - (case when old.reaction = 'clap' then 1 else 0 end)
            + (case when new.reaction = 'clap' then 1 else 0 end))
        where id = new.post_id;
      end if;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_post_like_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.post_id, old.post_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_post_likes_sync_count on public.post_likes;
create trigger trg_post_likes_sync_count
  after insert or delete or update of reaction on public.post_likes
  for each row execute function public.sync_post_like_count();
