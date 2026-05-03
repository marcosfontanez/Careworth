-- Allow email (and any client that sets metadata) to request a chosen @handle
-- at signup. Invalid / taken requests fall back to generate_unique_username().
-- Rare race: unique_violation on insert → regenerate handle and retry once.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full   text;
  v_first  text;
  v_last   text;
  v_email  text;
  v_seed   text;
  v_fb     text;
  v_handle text;
  v_terms  timestamptz;
  v_preferred_raw text;
  v_requested text;
begin
  v_full := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.email), ''),
    nullif(trim(new.phone), ''),
    'PulseVerse member'
  );

  v_first := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(
      split_part(
        coalesce(
          nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
          nullif(trim(new.email), ''),
          nullif(trim(new.phone), ''),
          'member'
        ),
        ' ',
        1
      ),
      ''
    ),
    'Member'
  );

  v_last := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_email := new.email;

  v_seed := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  v_fb := nullif(split_part(coalesce(v_email, ''), '@', 1), '');

  -- Optional handle from sign-up form (see AuthContext preferred_username).
  v_preferred_raw := nullif(
    trim(coalesce(new.raw_user_meta_data->>'preferred_username', '')),
    ''
  );

  if v_preferred_raw is not null then
    v_requested := public.slugify_username(v_preferred_raw);
  else
    v_requested := null;
  end if;

  if v_requested is not null
     and public.is_valid_username(v_requested)
     and not exists (select 1 from public.profiles p where p.username = v_requested)
  then
    v_handle := v_requested;
  else
    begin
      v_handle := public.generate_unique_username(v_seed, v_fb);
    exception when others then
      perform public.log_trigger_error(
        'handle_new_user_generate', tg_op, tg_table_name, sqlstate, sqlerrm,
        jsonb_build_object('user_id', new.id)
      );
      v_handle := null;
    end;
  end if;

  if v_handle is null then
    v_handle := public.generate_unique_username(v_seed, v_fb);
  end if;

  begin
    v_terms := nullif(trim(coalesce(new.raw_user_meta_data->>'terms_accepted_at', '')), '')::timestamptz;
  exception when others then
    v_terms := null;
  end;

  begin
    insert into public.profiles (
      id,
      display_name,
      first_name,
      last_name,
      avatar_url,
      username,
      terms_and_privacy_accepted_at
    )
    values (
      new.id,
      v_full,
      v_first,
      v_last,
      new.raw_user_meta_data->>'avatar_url',
      v_handle,
      v_terms
    );
  exception
    when unique_violation then
      v_handle := public.generate_unique_username(v_seed, v_fb);
      insert into public.profiles (
        id,
        display_name,
        first_name,
        last_name,
        avatar_url,
        username,
        terms_and_privacy_accepted_at
      )
      values (
        new.id,
        v_full,
        v_first,
        v_last,
        new.raw_user_meta_data->>'avatar_url',
        v_handle,
        v_terms
      );
  end;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates profiles row on auth.users insert. Honors raw_user_meta_data.preferred_username when valid+available; else auto handle. Retries on username unique_violation.';
