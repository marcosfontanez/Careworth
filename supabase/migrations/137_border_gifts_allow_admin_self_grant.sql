-- =============================================================================
-- 137: Allow sender_user_id = recipient_user_id on border_gifts.
-- Staff who grant a shop border to their own account (Shop Catalog admin) hit
-- this row after migration 136; the table still had check border_gifts_no_self.
-- IAP / store gift RPCs continue to enforce no self-gift via self_gift_not_allowed.
-- =============================================================================

alter table public.border_gifts
  drop constraint if exists border_gifts_no_self;

comment on table public.border_gifts is
  'Border gift deliveries. Sender may equal recipient for admin self-grants; '
  'purchase/gift RPCs still reject self_gift for normal checkout.';
