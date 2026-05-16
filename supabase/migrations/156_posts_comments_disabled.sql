-- Creator preference: block new comments while keeping existing thread readable.
alter table public.posts
  add column if not exists comments_disabled boolean not null default false;

comment on column public.posts.comments_disabled is
  'When true, inserts into public.comments are rejected by RLS for that post.';

-- Tighten insert policy so disabled posts cannot accept new comments (any author).
drop policy if exists "Users can create comments" on public.comments;

create policy "Users can create comments"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and coalesce(p.comments_disabled, false) = false
    )
  );
