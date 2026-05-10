-- ============================================================================
-- 131: Sync profiles.selected_pulse_avatar_frame_id when equipping a shop border
-- Shop inventory equip previously did not update the profile pulse frame, so
-- avatars kept showing an old frame (e.g. beta) after granting/equipping Pride.
-- Resolves pulse_avatar_frames.slug from shop_items.metadata.pulse_frame_slug
-- or from known shop slugs (pride, beta pioneer).
-- ============================================================================

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
    v_slug := case lower(v_shop_slug)
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    update public.profiles
    set selected_pulse_avatar_frame_id = v_frame_id
    where id = v_uid;
  end if;
end;
$$;

comment on function public.economy_equip_border(uuid) is
  'Equips one shop border in user_inventory and mirrors to profiles.selected_pulse_avatar_frame_id when a matching pulse_avatar_frames.slug exists.';
