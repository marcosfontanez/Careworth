-- Queue reward celebration when a live host earns Diamonds from sticker gifts (stream_gifts + ledger in RPC 143/158).

create or replace function public.reward_delivery_enqueue_on_stream_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
  v_sparks int;
  v_diamonds int;
  v_sender_label text;
begin
  v_sparks := coalesce(NEW.coin_cost, 0) * greatest(coalesce(NEW.quantity, 0), 0);
  if v_sparks <= 0 then
    return NEW;
  end if;

  begin
    select ls.host_id
    into v_host
    from public.live_streams ls
    where ls.id = NEW.stream_id::uuid;
  exception
    when invalid_text_representation then
      v_host := null;
  end;

  if v_host is null then
    return NEW;
  end if;

  if NEW.sender_id = v_host then
    return NEW;
  end if;

  v_diamonds := greatest(public._economy_sparks_to_diamonds(v_sparks), 0);
  if v_diamonds <= 0 then
    return NEW;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Someone')
  into v_sender_label
  from public.profiles p
  where p.id = NEW.sender_id;

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
    v_host,
    'gift',
    'diamonds',
    null,
    v_diamonds,
    NEW.sender_id,
    v_sender_label,
    jsonb_build_object(
      'kind', 'diamonds',
      'reason', 'live_stream',
      'gift_name', coalesce(nullif(trim(NEW.gift_name), ''), 'Live gift'),
      'stream_gift_id', NEW.id::text,
      'stream_id', NEW.stream_id,
      'gift_id', NEW.gift_id,
      'sparks_spent', v_sparks
    ),
    'pending',
    'live_stream_diamonds:' || NEW.id::text
  )
  on conflict (user_id, idempotency_key) do nothing;

  return NEW;
end;
$$;

comment on function public.reward_delivery_enqueue_on_stream_gift() is
  'After stream_gifts insert with paid Sparks, enqueue reward_deliveries for the stream host (celebration only).';

drop trigger if exists trg_stream_gifts_reward_delivery on public.stream_gifts;
create trigger trg_stream_gifts_reward_delivery
  after insert on public.stream_gifts
  for each row
  execute function public.reward_delivery_enqueue_on_stream_gift();
