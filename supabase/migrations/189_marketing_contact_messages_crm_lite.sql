-- CRM-lite fields for marketing contact inquiries + admin RLS so staff sessions can triage without service role.

alter table public.marketing_contact_messages
  add column if not exists status text not null default 'new';

alter table public.marketing_contact_messages
  add column if not exists owner_id uuid references public.profiles (id) on delete set null;

alter table public.marketing_contact_messages
  add column if not exists internal_notes text;

alter table public.marketing_contact_messages
  add column if not exists last_contacted_at timestamptz;

alter table public.marketing_contact_messages
  drop constraint if exists marketing_contact_messages_status_check;

alter table public.marketing_contact_messages
  add constraint marketing_contact_messages_status_check check (
    status in (
      'new',
      'contacted',
      'qualified',
      'proposal_sent',
      'closed_won',
      'closed_lost'
    )
  );

create index if not exists idx_marketing_contact_messages_status_created
  on public.marketing_contact_messages (status, created_at desc);

create index if not exists idx_marketing_contact_messages_owner
  on public.marketing_contact_messages (owner_id)
  where owner_id is not null;

drop policy if exists "Admins read marketing contact messages" on public.marketing_contact_messages;
create policy "Admins read marketing contact messages"
  on public.marketing_contact_messages for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );

drop policy if exists "Admins update marketing contact messages" on public.marketing_contact_messages;
create policy "Admins update marketing contact messages"
  on public.marketing_contact_messages for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role_admin = true)
  );
