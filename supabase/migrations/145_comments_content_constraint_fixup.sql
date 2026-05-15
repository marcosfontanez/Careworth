-- Repair migration 144 if it failed at VALIDATE: legacy comment bodies >300 chars, and duplicate
-- length CHECK (043) still enforced on row updates.

update public.comments
set content = left(content, 300)
where char_length(content) > 300;

alter table public.comments drop constraint if exists comments_content_length_300;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'comments'
      and c.conname = 'comments_content_or_media_ck'
      and not c.convalidated
  ) then
    alter table public.comments validate constraint comments_content_or_media_ck;
  end if;
end $$;
