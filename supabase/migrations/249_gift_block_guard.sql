-- ============================================================
-- PulseVerse: block-aware gifting (server-authoritative)
-- ------------------------------------------------------------
-- Prevent gifting between users who have a block relationship in EITHER
-- direction. Enforced with BEFORE INSERT triggers on the gift tables so every
-- path (economy_send_creator_gift RPC, border gift RPC, any future caller) is
-- covered without rewriting the large gift RPCs.
--
-- Push + in-app notification suppression for blocked actors already exists
-- (notify-expo-push skips blocked senders; mobile notification.getAll filters
-- blocked actors). This closes the remaining gap: the gift itself.
-- ============================================================

create or replace function public.economy_assert_gift_not_blocked(
  p_sender uuid,
  p_recipient uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_sender is null or p_recipient is null then
    return;
  end if;
  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = p_sender and b.blocked_id = p_recipient)
       or (b.blocker_id = p_recipient and b.blocked_id = p_sender)
  ) then
    raise exception 'gift_blocked';
  end if;
end;
$$;

create or replace function public.trg_creator_gifts_block_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.economy_assert_gift_not_blocked(new.sender_user_id, new.creator_user_id);
  return new;
end;
$$;

create or replace function public.trg_border_gifts_block_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.economy_assert_gift_not_blocked(new.sender_user_id, new.recipient_user_id);
  return new;
end;
$$;

drop trigger if exists creator_gifts_block_guard on public.creator_gifts;
create trigger creator_gifts_block_guard
  before insert on public.creator_gifts
  for each row execute function public.trg_creator_gifts_block_guard();

drop trigger if exists border_gifts_block_guard on public.border_gifts;
create trigger border_gifts_block_guard
  before insert on public.border_gifts
  for each row execute function public.trg_border_gifts_block_guard();
