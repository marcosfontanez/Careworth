-- Co-create invites (host → invitee). App wiring can queue clips later.
create table if not exists public.post_collab_invites (
  id uuid primary key default gen_random_uuid(),
  host_creator_id uuid not null references public.profiles (id) on delete cascade,
  invitee_user_id uuid references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'submitted')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_collab_invites_host_idx
  on public.post_collab_invites (host_creator_id, created_at desc);

alter table public.post_collab_invites enable row level security;

create policy "collab_invites_host_select"
  on public.post_collab_invites for select
  using (auth.uid() = host_creator_id or auth.uid() = invitee_user_id);

create policy "collab_invites_host_insert"
  on public.post_collab_invites for insert
  with check (auth.uid() = host_creator_id);

create policy "collab_invites_parties_update"
  on public.post_collab_invites for update
  using (auth.uid() = host_creator_id or auth.uid() = invitee_user_id);
