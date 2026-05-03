-- Handle (@username) content policy: reserved brand/role tokens, coarse profanity,
-- and compact hate slurs. Used by check_username_available, signup trigger, and
-- generate_unique_username. Keep lists aligned with lib/handleContentPolicy.ts.

create or replace function public.username_passes_content_policy(s text)
returns boolean
language plpgsql
immutable
as $$
declare
  compact text;
  tok text;
  arr text[];
  blocked_sub text;
  blocked_exact text[] := array[
    'mod','moderator','moderators','support','official','staff','verified',
    'security','root','system','helpdesk','administrator','pulsestaff','custodian',
    'fuck','fucks','fucked','fucking','fucker','motherfucker',
    'shit','shits','shitty','bitch','bitches','whore','whores','slut','sluts',
    'cunt','cunts','dick','dicks','dickhead','cock','cocks','pussy',
    'porn','porno','pedo','rape','rapist','nazi','nazis','kkk','isis',
    'coon','spic','cum','jizz','bollocks','bastard','wanker','twat'
  ];
  blocked_compact text[] := array[
    'nigger','nigga','faggot','faggit','chink','retard',
    'hitler','genocide','terrorist','pedoph','necroph','bestial'
  ];
begin
  if s is null then
    return false;
  end if;
  s := lower(trim(s));
  if s = '' then
    return false;
  end if;

  compact := regexp_replace(s, '[._]+', '', 'g');

  if position('pulseverse' in compact) > 0 or position('pulseverse' in s) > 0 then
    return false;
  end if;

  arr := regexp_split_to_array(s, '[._]+');
  foreach tok in array arr
  loop
    if tok is null or tok = '' then
      continue;
    end if;
    if tok like 'admin%' then
      return false;
    end if;
  end loop;

  foreach tok in array arr
  loop
    if tok is null or tok = '' then
      continue;
    end if;
    if tok = any (blocked_exact) then
      return false;
    end if;
  end loop;

  foreach blocked_sub in array blocked_compact
  loop
    if position(blocked_sub in compact) > 0 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

comment on function public.username_passes_content_policy(text) is
  'False for reserved PulseVerse/ staff-like tokens, admin* segments, and coarse blocked words. Sync with lib/handleContentPolicy.ts.';

create or replace function public.generate_unique_username(
  preferred_seed text,
  fallback_seed  text default null
)
returns text
language plpgsql
as $$
declare
  base      text;
  candidate text;
  attempt   int := 1;
  max_base  int;
  rand_suf  text;
begin
  base := public.slugify_username(preferred_seed);
  if base is null then
    base := public.slugify_username(fallback_seed);
  end if;
  if base is null then
    base := 'user.' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  max_base := 30 - 4;
  if length(base) > max_base then
    base := substring(base from 1 for max_base);
    base := regexp_replace(base, '[._]+$', '');
    if length(base) < 3 then
      base := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    end if;
  end if;

  if not public.username_passes_content_policy(base) then
    base := 'user.' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  candidate := base;
  loop
    if public.username_passes_content_policy(candidate)
       and not exists (select 1 from public.profiles where username = candidate) then
      return candidate;
    end if;
    attempt := attempt + 1;
    if attempt > 9999 then
      exit;
    end if;
    candidate := base || attempt::text;
  end loop;

  loop
    rand_suf := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    candidate := base || rand_suf;
    exit when public.username_passes_content_policy(candidate)
      and not exists (select 1 from public.profiles where username = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.check_username_available(candidate text)
returns boolean
language plpgsql
stable
as $$
declare
  c text;
begin
  c := lower(trim(coalesce(candidate, '')));
  if not public.is_valid_username(c) then
    return false;
  end if;
  if not public.username_passes_content_policy(c) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = c);
end;
$$;

-- Signup: reject preferred handle when it fails grammar, policy, or uniqueness.
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
     and public.username_passes_content_policy(v_requested)
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

-- Table CHECK skipped: existing rows may predate this policy; enforcement is via
-- check_username_available, handle_new_user, and generate_unique_username. Add a
-- validated constraint in a follow-up migration after auditing:
--   select username from public.profiles where not public.username_passes_content_policy(username);
