-- Record when a user accepts Terms + Privacy (and HIPAA acknowledgments at signup).
-- Email sign-up passes `terms_accepted_at` in auth raw_user_meta_data; OAuth users complete `/auth/legal-ack`.

alter table public.profiles
  add column if not exists terms_and_privacy_accepted_at timestamptz;

comment on column public.profiles.terms_and_privacy_accepted_at is
  'When the user accepted Terms of Service and Privacy Policy (including HIPAA/patient-privacy obligations). Set from sign-up metadata or legal-ack screen.';

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
begin
  v_full  := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_first := coalesce(
    new.raw_user_meta_data->>'first_name',
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1)
  );
  v_last  := new.raw_user_meta_data->>'last_name';
  v_email := new.email;

  v_seed := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  v_fb   := nullif(split_part(coalesce(v_email, ''), '@', 1), '');

  begin
    v_handle := public.generate_unique_username(v_seed, v_fb);
  exception when others then
    perform public.log_trigger_error(
      'handle_new_user_generate', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('user_id', new.id)
    );
    v_handle := null;
  end;

  begin
    v_terms := nullif(trim(coalesce(new.raw_user_meta_data->>'terms_accepted_at', '')), '')::timestamptz;
  exception when others then
    v_terms := null;
  end;

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
  return new;
end;
$$;
