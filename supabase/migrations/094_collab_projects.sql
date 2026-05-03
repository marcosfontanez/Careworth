-- Co-create: host-owned project + ordered slots; optional link to post_collab_invites.

create table if not exists public.collab_projects (
  id uuid primary key default gen_random_uuid(),
  host_creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Co-create',
  status text not null default 'draft' check (status in ('draft', 'collecting', 'stitching', 'done', 'cancelled')),
  result_storage_path text,
  published_post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collab_projects_host_idx
  on public.collab_projects (host_creator_id, created_at desc);

create table if not exists public.collab_slots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collab_projects (id) on delete cascade,
  slot_index smallint not null,
  max_duration_sec smallint not null default 10,
  invite_id uuid references public.post_collab_invites (id) on delete set null,
  invitee_user_id uuid references public.profiles (id) on delete set null,
  submitted_storage_path text,
  status text not null default 'empty' check (status in ('empty', 'invited', 'submitted')),
  unique (project_id, slot_index)
);

create index if not exists collab_slots_project_idx on public.collab_slots (project_id, slot_index);

alter table public.post_collab_invites
  add column if not exists collab_project_id uuid references public.collab_projects (id) on delete set null;

alter table public.post_collab_invites
  add column if not exists slot_index smallint;

alter table public.collab_projects enable row level security;

create policy collab_projects_host_all
  on public.collab_projects for all
  using (auth.uid() = host_creator_id)
  with check (auth.uid() = host_creator_id);

alter table public.collab_slots enable row level security;

create policy collab_slots_host_all
  on public.collab_slots for all
  using (
    exists (
      select 1 from public.collab_projects cp
      where cp.id = project_id and cp.host_creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collab_projects cp
      where cp.id = project_id and cp.host_creator_id = auth.uid()
    )
  );

create policy collab_slots_invitee_select
  on public.collab_slots for select using (invitee_user_id = auth.uid());

create policy collab_slots_invitee_update
  on public.collab_slots for update using (invitee_user_id = auth.uid());
