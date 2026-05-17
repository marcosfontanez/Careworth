-- Stitch / concat pipeline: hide posts from main feeds until creator_media_jobs completes,
-- then worker patches posts.media_url with the merged export.

alter table public.posts
  add column if not exists media_processing_status text;

alter table public.posts drop constraint if exists posts_media_processing_status_chk;

alter table public.posts
  add constraint posts_media_processing_status_chk
  check (
    media_processing_status is null
    or media_processing_status in ('queued', 'running', 'failed')
  );

alter table public.posts
  add column if not exists media_processing_job_id uuid;

alter table public.posts
  add column if not exists media_processing_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_media_processing_job_id_fkey'
  ) then
    alter table public.posts
      add constraint posts_media_processing_job_id_fkey
      foreign key (media_processing_job_id) references public.creator_media_jobs(id) on delete set null;
  end if;
end$$;

create index if not exists posts_media_processing_status_main_feed_idx
  on public.posts (creator_id, created_at desc)
  where media_processing_status is not null;

comment on column public.posts.media_processing_status is
  'queued | running | failed while concat/export runs; null = ready. Main algorithmic feeds exclude queued|running.';
comment on column public.posts.media_processing_job_id is
  'Optional link to public.creator_media_jobs row stitching/combining clips into media_url.';
comment on column public.posts.media_processing_error is
  'Last worker/client error when media_processing_status = failed.';
