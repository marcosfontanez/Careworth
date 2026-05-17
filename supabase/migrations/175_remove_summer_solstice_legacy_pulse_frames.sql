-- ============================================================================
-- 175: Drop Summer Solstice legacy IAP pulse_avatar_frames (Solar Crown /
-- Silver Solstice / Bronze Horizon shop mirrors). Strip shop metadata bridge;
-- simplify equip/sync RPCs (no canonical slug map for solar-crown trio).
-- ============================================================================

with doomed as (
  select id
  from public.pulse_avatar_frames
  where slug in (
    'summer-solstice-2026-gold-border',
    'summer-solstice-2026-silver-border',
    'summer-solstice-2026-bronze-border'
  )
)
delete from public.user_pulse_avatar_frames u
where u.frame_id in (select id from doomed);

update public.profiles p
set selected_pulse_avatar_frame_id = null, updated_at = now()
where p.selected_pulse_avatar_frame_id in (
  select id
  from public.pulse_avatar_frames
  where slug in (
    'summer-solstice-2026-gold-border',
    'summer-solstice-2026-silver-border',
    'summer-solstice-2026-bronze-border'
  )
);

delete from public.pulse_avatar_frames
where slug in (
  'summer-solstice-2026-gold-border',
  'summer-solstice-2026-silver-border',
  'summer-solstice-2026-bronze-border'
);

update public.shop_items si
set
  metadata = coalesce(si.metadata, '{}'::jsonb) - 'pulse_frame_slug',
  updated_at = now()
where si.type = 'border'
  and si.slug in ('solar-crown', 'silver-solstice', 'bronze-horizon');

create or replace function public._economy_sync_user_pulse_frame_from_shop_item(
  p_user_id uuid,
  p_shop_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_shop_slug text;
  v_slug text;
  v_frame_id uuid;
begin
  if p_user_id is null or p_shop_item_id is null then
    return;
  end if;

  select si.metadata, si.slug
  into v_meta, v_shop_slug
  from public.shop_items si
  where si.id = p_shop_item_id
  limit 1;

  if not found then
    return;
  end if;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');
  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(trim(coalesce(v_shop_slug, '')))
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      when 'border-emerald-renewal-may-2026' then 'emerald-renewal-may-2026-border'
      when 'border_emerald_renewal_may_2026' then 'emerald-renewal-may-2026-border'
      else null
    end;
  end if;

  if v_slug is null then
    return;
  end if;

  select paf.id
  into v_frame_id
  from public.pulse_avatar_frames paf
  where paf.slug = v_slug
  limit 1;

  if v_frame_id is null then
    return;
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
  values (p_user_id, v_frame_id, 0, 'shop')
  on conflict (user_id, frame_id) do nothing;
end;
$$;

comment on function public._economy_sync_user_pulse_frame_from_shop_item(uuid, uuid) is
  'Ensures user_pulse_avatar_frames has a mirrored row when metadata.pulse_frame_slug (or known shop slug map) resolves to pulse_avatar_frames.slug.';

create or replace function public.economy_equip_border(p_inventory_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_item uuid;
  si_type text;
  v_shop_slug text;
  v_meta jsonb;
  v_slug text;
  v_frame_id uuid;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select ui.user_id, ui.shop_item_id
  into v_user, v_item
  from public.user_inventory ui
  where ui.id = p_inventory_item_id
  for update;

  if not found or v_user is distinct from v_uid then
    raise exception 'not_allowed';
  end if;

  select type into si_type from public.shop_items where id = v_item;
  if si_type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  update public.user_inventory
  set is_equipped = false
  where user_id = v_uid and item_kind = 'border';

  update public.user_inventory
  set is_equipped = true
  where id = p_inventory_item_id and user_id = v_uid;

  select si.slug, si.metadata
  into v_shop_slug, v_meta
  from public.shop_items si
  where si.id = v_item;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');
  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(trim(coalesce(v_shop_slug, '')))
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      when 'border-emerald-renewal-may-2026' then 'emerald-renewal-may-2026-border'
      when 'border_emerald_renewal_may_2026' then 'emerald-renewal-may-2026-border'
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    if v_frame_id is not null then
      update public.profiles
      set selected_pulse_avatar_frame_id = v_frame_id
      where id = v_uid;
    end if;
  end if;
end;
$$;

comment on function public.economy_equip_border(uuid) is
  'Equips one shop border and mirrors to profiles.selected_pulse_avatar_frame_id when metadata.pulse_frame_slug or slug map resolves to pulse_avatar_frames.slug.';
