-- Automatically increment posts.view_count when a new row is inserted into post_views

create or replace function public.increment_view_count()
returns trigger as $$
begin
  update public.posts
  set view_count = view_count + 1
  where id = NEW.post_id;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_increment_view_count on public.post_views;

create trigger trg_increment_view_count
  after insert on public.post_views
  for each row
  execute function public.increment_view_count();

-- Backfill view_count from existing post_views rows
update public.posts p
set view_count = coalesce(sub.cnt, 0)
from (
  select post_id, count(*) as cnt
  from public.post_views
  group by post_id
) sub
where p.id = sub.post_id
  and p.view_count < sub.cnt;
