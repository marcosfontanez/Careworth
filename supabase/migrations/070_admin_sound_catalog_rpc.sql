-- Staff RLS + RPCs to manage curated sounds from the mobile admin app (no raw SQL).

drop policy if exists "Staff read all sound_catalog" on public.sound_catalog;
create policy "Staff read all sound_catalog"
  on public.sound_catalog for select
  using (
    exists (
      select 1
      from public.profiles pr
      where pr.id = auth.uid()
        and coalesce(pr.role_admin, false) = true
    )
  );

-- Upsert: post must be an eligible original video sound source.
create or replace function public.admin_upsert_sound_catalog(
  p_post_id uuid,
  p_artist text default null,
  p_keywords text default null,
  p_sort_boost int default 1000,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff boolean;
  v_id uuid;
  v_ok boolean;
begin
  select coalesce(role_admin, false) into v_staff
  from public.profiles
  where id = auth.uid();

  if not coalesce(v_staff, false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select exists(
    select 1
    from public.posts po
    where po.id = p_post_id
      and po.type = 'video'
      and coalesce(trim(po.media_url), '') <> ''
      and coalesce(po.is_anonymous, false) = false
      and po.sound_source_post_id is null
  )
  into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'invalid_post_for_catalog: need video with media_url, not anonymous, original audio (no sound_source_post_id)';
  end if;

  insert into public.sound_catalog (post_id, artist, keywords, sort_boost, is_active)
  values (
    p_post_id,
    nullif(trim(p_artist), ''),
    nullif(trim(p_keywords), ''),
    greatest(0, least(coalesce(p_sort_boost, 1000), 100000)),
    coalesce(p_is_active, true)
  )
  on conflict (post_id) do update set
    artist = excluded.artist,
    keywords = excluded.keywords,
    sort_boost = excluded.sort_boost,
    is_active = excluded.is_active
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_delete_sound_catalog(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce((select role_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.sound_catalog where post_id = p_post_id;
end;
$$;

grant execute on function public.admin_upsert_sound_catalog(uuid, text, text, int, boolean) to authenticated;
grant execute on function public.admin_delete_sound_catalog(uuid) to authenticated;
