-- Comment threads: multi-emoji reactions (same tokens as post_likes) + optional image attachment.

-- ─── comment_likes.reaction ─────────────────────────────────────────
alter table public.comment_likes
  add column if not exists reaction text not null default 'heart';

update public.comment_likes set reaction = 'heart' where reaction is null or trim(reaction) = '';

alter table public.comment_likes
  drop constraint if exists comment_likes_reaction_check;

alter table public.comment_likes
  add constraint comment_likes_reaction_check
  check (reaction in ('heart', 'haha', 'wow', 'sad', 'angry', 'clap'));

-- ─── comments: per-kind reaction totals + optional media ─────────────
alter table public.comments add column if not exists reaction_heart_count int not null default 0;
alter table public.comments add column if not exists reaction_haha_count int not null default 0;
alter table public.comments add column if not exists reaction_wow_count int not null default 0;
alter table public.comments add column if not exists reaction_sad_count int not null default 0;
alter table public.comments add column if not exists reaction_angry_count int not null default 0;
alter table public.comments add column if not exists reaction_clap_count int not null default 0;

alter table public.comments add column if not exists media_url text;

comment on column public.comments.media_url is
  'Optional image on a feed/circle comment; public URL (typically post-media bucket).';

-- Legacy rows may exceed 300 chars; `comments_content_length_300` (043, NOT VALID) still
-- enforces on UPDATE. Normalize + drop the duplicate CHECK before rebuilding counts.
update public.comments
set content = left(content, 300)
where char_length(content) > 300;

alter table public.comments drop constraint if exists comments_content_length_300;

-- Allow empty caption when an image is present (still capped at 300 chars when non-empty).
alter table public.comments drop constraint if exists comments_content_or_media_ck;

alter table public.comments
  add constraint comments_content_or_media_ck
  check (
    char_length(content) <= 300
    and (
      char_length(trim(content)) > 0
      or (media_url is not null and char_length(trim(media_url)) > 0)
    )
  ) not valid;

-- ─── Rebuild denormalized counters from comment_likes ────────────────
update public.comments c set
  like_count = 0,
  reaction_heart_count = 0,
  reaction_haha_count = 0,
  reaction_wow_count = 0,
  reaction_sad_count = 0,
  reaction_angry_count = 0,
  reaction_clap_count = 0;

update public.comments c set
  like_count = agg.tot,
  reaction_heart_count = agg.h,
  reaction_haha_count = agg.ha,
  reaction_wow_count = agg.w,
  reaction_sad_count = agg.s,
  reaction_angry_count = agg.a,
  reaction_clap_count = agg.cl
from (
  select
    comment_id,
    count(*)::int as tot,
    count(*) filter (where reaction = 'heart')::int as h,
    count(*) filter (where reaction = 'haha')::int as ha,
    count(*) filter (where reaction = 'wow')::int as w,
    count(*) filter (where reaction = 'sad')::int as s,
    count(*) filter (where reaction = 'angry')::int as a,
    count(*) filter (where reaction = 'clap')::int as cl
  from public.comment_likes
  group by comment_id
) agg
where c.id = agg.comment_id;

-- ─── Trigger: keep like_count + reaction_* in sync ───────────────────
create or replace function public.sync_comment_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.comments set
        like_count = like_count + 1,
        reaction_heart_count = reaction_heart_count + (case when new.reaction = 'heart' then 1 else 0 end),
        reaction_haha_count = reaction_haha_count + (case when new.reaction = 'haha' then 1 else 0 end),
        reaction_wow_count = reaction_wow_count + (case when new.reaction = 'wow' then 1 else 0 end),
        reaction_sad_count = reaction_sad_count + (case when new.reaction = 'sad' then 1 else 0 end),
        reaction_angry_count = reaction_angry_count + (case when new.reaction = 'angry' then 1 else 0 end),
        reaction_clap_count = reaction_clap_count + (case when new.reaction = 'clap' then 1 else 0 end)
      where id = new.comment_id;
    elsif tg_op = 'DELETE' then
      update public.comments set
        like_count = greatest(0, like_count - 1),
        reaction_heart_count = greatest(0, reaction_heart_count - (case when old.reaction = 'heart' then 1 else 0 end)),
        reaction_haha_count = greatest(0, reaction_haha_count - (case when old.reaction = 'haha' then 1 else 0 end)),
        reaction_wow_count = greatest(0, reaction_wow_count - (case when old.reaction = 'wow' then 1 else 0 end)),
        reaction_sad_count = greatest(0, reaction_sad_count - (case when old.reaction = 'sad' then 1 else 0 end)),
        reaction_angry_count = greatest(0, reaction_angry_count - (case when old.reaction = 'angry' then 1 else 0 end)),
        reaction_clap_count = greatest(0, reaction_clap_count - (case when old.reaction = 'clap' then 1 else 0 end))
      where id = old.comment_id;
    elsif tg_op = 'UPDATE' then
      if old.reaction is distinct from new.reaction then
        update public.comments set
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
        where id = new.comment_id;
      end if;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_comment_reaction_counts', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('comment_id', coalesce(new.comment_id, old.comment_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_comment_likes_sync_counts on public.comment_likes;
create trigger trg_comment_likes_sync_counts
  after insert or delete or update of reaction on public.comment_likes
  for each row execute function public.sync_comment_reaction_counts();

-- Legacy RPC replaced by trigger (+ client upsert/update/delete on comment_likes).
drop function if exists public.increment_comment_likes(uuid);

alter table public.comments validate constraint comments_content_or_media_ck;
