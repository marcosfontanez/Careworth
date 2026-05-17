-- When a creator earns Diamonds from a Sparks gift, queue celebration UX (server-side; grants already posted).

create or replace function public.reward_delivery_enqueue_on_creator_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift_name text;
  v_sender_label text;
begin
  if NEW.diamonds_earned is null or NEW.diamonds_earned <= 0 then
    return NEW;
  end if;

  select si.name into v_gift_name
  from public.shop_items si
  where si.id = NEW.gift_item_id;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Someone')
  into v_sender_label
  from public.profiles p
  where p.id = NEW.sender_user_id;

  insert into public.reward_deliveries (
    user_id,
    delivery_type,
    item_type,
    item_id,
    quantity,
    source_user_id,
    source_display_name,
    metadata,
    status,
    idempotency_key
  )
  values (
    NEW.creator_user_id,
    'gift',
    'diamonds',
    NEW.gift_item_id,
    NEW.diamonds_earned,
    NEW.sender_user_id,
    v_sender_label,
    jsonb_build_object(
      'kind', 'diamonds',
      'reason', 'gift_conversion',
      'gift_name', coalesce(v_gift_name, 'Gift'),
      'creator_gift_id', NEW.id::text,
      'context_type', NEW.context_type,
      'sparks_spent', NEW.sparks_spent
    ),
    'pending',
    'creator_gift_diamonds:' || NEW.id::text
  )
  on conflict (user_id, idempotency_key) do nothing;

  return NEW;
end;
$$;

comment on function public.reward_delivery_enqueue_on_creator_gift() is
  'After creator_gifts insert, enqueue reward_deliveries row for the earning creator (celebration only).';

drop trigger if exists trg_creator_gifts_reward_delivery on public.creator_gifts;
create trigger trg_creator_gifts_reward_delivery
  after insert on public.creator_gifts
  for each row
  execute function public.reward_delivery_enqueue_on_creator_gift();
