-- Admin-curated featured circle order + per-circle pinned posts.
-- RLS: public read; writes restricted to profiles.role_admin = true.

alter table public.communities
  add column if not exists featured_order int;

comment on column public.communities.featured_order is
  'Admin-only display order on Circles home featured carousels. NULL = not in curated featured set. Lower numbers appear first.';

-- Seed curated order to match previous FEATURED_CIRCLE_SLUGS_ORDER constant (no-op if slugs missing).
update public.communities c
set featured_order = v.ord
from (
  values
    ('memes', 1),
    ('confessions', 2),
    ('nurses', 3),
    ('pct-cna', 4),
    ('doctors', 5),
    ('pharmacists', 6),
    ('therapy', 7)
) as v (slug, ord)
where c.slug = v.slug;

create table if not exists public.community_post_pins (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (community_id, post_id)
);

create index if not exists idx_community_post_pins_community_sort
  on public.community_post_pins (community_id, sort_order);

alter table public.community_post_pins enable row level security;

create policy "Community post pins are viewable by everyone"
  on public.community_post_pins for select using (true);

create policy "Admins can manage community post pins"
  on public.community_post_pins for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );

-- Communities: allow admins to create rooms and edit curation fields (and metadata).
create policy "Admins can insert communities"
  on public.communities for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );

create policy "Admins can update communities"
  on public.communities for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_admin = true
    )
  );
