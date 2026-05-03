-- Messaging + blocked users: symmetric enforcement
-- 1) Both parties can SELECT a block row (so RLS subqueries / clients can detect blocks)
-- 2) Only blocker can INSERT / DELETE their block rows
-- 3) Conversations + messages hidden / denied when a block exists between participants

-- ─── blocked_users policies ─────────────────────────────────
drop policy if exists "Users can manage own blocks" on public.blocked_users;

drop policy if exists "Participants can see blocks involving them" on public.blocked_users;
create policy "Participants can see blocks involving them"
  on public.blocked_users for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users insert own blocks" on public.blocked_users;
create policy "Users insert own blocks"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users delete own blocks" on public.blocked_users;
create policy "Users delete own blocks"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- ─── conversations ───────────────────────────────────────────
drop policy if exists "Users can view own conversations" on public.conversations;
create policy "Users can view own conversations"
  on public.conversations for select using (
    (auth.uid() = participant_1 or auth.uid() = participant_2)
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = participant_1 and bu.blocked_id = participant_2)
         or (bu.blocker_id = participant_2 and bu.blocked_id = participant_1)
    )
  );

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations for insert with check (
    (auth.uid() = participant_1 or auth.uid() = participant_2)
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = participant_1 and bu.blocked_id = participant_2)
         or (bu.blocker_id = participant_2 and bu.blocked_id = participant_1)
    )
  );

-- ─── messages ─────────────────────────────────────────────
drop policy if exists "Users can view messages in own conversations" on public.messages;
create policy "Users can view messages in own conversations"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );

drop policy if exists "Users can send messages in own conversations" on public.messages;
create policy "Users can send messages in own conversations"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );

drop policy if exists "Users can update own messages" on public.messages;
-- Allow either participant to update rows in a non-blocked chat (needed for read receipts).
create policy "Users can update messages in non-blocked chats"
  on public.messages for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );
