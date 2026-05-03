-- Allow either participant to delete a DM thread (messages cascade via FK).

drop policy if exists "Participants can delete own conversations" on public.conversations;
create policy "Participants can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = participant_1 or auth.uid() = participant_2);
