-- ============================================================
-- PulseVerse: Direct Messaging
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_1 uuid references public.profiles(id) on delete cascade not null,
  participant_2 uuid references public.profiles(id) on delete cascade not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(participant_1, participant_2)
);

alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select using (
    auth.uid() = participant_1 or auth.uid() = participant_2
  );

create policy "Users can create conversations"
  on public.conversations for insert with check (
    auth.uid() = participant_1 or auth.uid() = participant_2
  );

create index idx_conversations_p1 on public.conversations(participant_1, last_message_at desc);
create index idx_conversations_p2 on public.conversations(participant_2, last_message_at desc);

-- ============================================================

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages in own conversations"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Users can send messages in own conversations"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Users can update own messages"
  on public.messages for update using (auth.uid() = sender_id);

create index idx_messages_conversation on public.messages(conversation_id, created_at desc);

-- Auto-update conversation last_message_at
create or replace function public.update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_sent
  after insert on public.messages
  for each row execute function public.update_conversation_timestamp();
