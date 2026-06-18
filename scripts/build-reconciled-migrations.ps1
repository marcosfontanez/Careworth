# Build reconciled post-285 migrations from parked WIP sources (253-278).
# Run from repo root after parking WIP files to supabase/migrations-parked/wip-253-278/

$ErrorActionPreference = 'Stop'
$src = 'supabase/migrations-parked/wip-253-278'
$dst = 'supabase/migrations'

function Join-Migration {
  param(
    [string]$OutName,
    [string]$Header,
    [string[]]$Sources
  )
  $outPath = Join-Path $dst $OutName
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("-- ============================================================")
  [void]$sb.AppendLine("-- $Header")
  [void]$sb.AppendLine("-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)")
  [void]$sb.AppendLine("-- ============================================================")
  [void]$sb.AppendLine("")
  foreach ($rel in $Sources) {
    $path = Join-Path $src $rel
    if (-not (Test-Path $path)) { throw "Missing source: $path" }
    [void]$sb.AppendLine("-- ---------- source: $rel ----------")
    [void]$sb.AppendLine((Get-Content $path -Raw))
    [void]$sb.AppendLine("")
  }
  [System.IO.File]::WriteAllText($outPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Wrote $OutName"
}

$maps = @(
  @{ Out = '286_onboarding_audience_preferences.sql'; Header = 'Onboarding audience preferences'; Sources = @('254_onboarding_audience_preferences.sql') },
  @{ Out = '287_reapply_profiles_column_grants.sql'; Header = 'Re-apply profiles column grants after onboarding columns'; Sources = @('256_reapply_profiles_column_grants.sql') },
  @{ Out = '288_profiles_pulse_status.sql'; Header = 'Profile pulse status'; Sources = @('258_profiles_pulse_status.sql') },
  @{ Out = '289_profile_board_shoutouts.sql'; Header = 'Pulse Board shoutouts, rate limits, pin + notify'; Sources = @('259_profile_board_shoutouts.sql', '260_profile_board_shoutout_rate_limit.sql', '261_profile_board_pin_and_notify.sql') },
  @{ Out = '290_profile_board_weekly_recap_snapshot.sql'; Header = 'Pulse weekly recap + snapshot counts'; Sources = @('262_my_pulse_weekly_recap.sql', '263_pulse_snapshot_recap_counts.sql') },
  @{ Out = '291_profile_board_retention_public_read_fixes.sql'; Header = 'Pulse Board retention, public-by-default, read fixes'; Sources = @('264_pulse_board_retention.sql', '265_pulse_board_public_by_default.sql', '266_fix_pulse_board_read_and_posts_viewer_safe.sql') },
  @{ Out = '292_circle_helpful_core.sql'; Header = 'Circle reply helpful reactions + hardening + notifications'; Sources = @('267_circle_reply_helpful_and_activity_badges.sql', '268_circle_reply_helpful_hardening.sql', '270_circle_reply_helpful_notifications.sql') },
  @{ Out = '293_circle_identity_metadata.sql'; Header = 'Circle identity metadata foundation'; Sources = @('269_circle_identity_foundation.sql') },
  @{ Out = '294_general_public_circles.sql'; Header = 'General public circles'; Sources = @('273_general_public_circles.sql') },
  @{ Out = '295_circle_weekly_prompts_core.sql'; Header = 'Circle weekly prompts + configs'; Sources = @('274_circle_weekly_prompts.sql', '275_circle_prompt_configs.sql') },
  @{ Out = '296_circle_weekly_prompts_metrics.sql'; Header = 'Circle weekly prompt metrics'; Sources = @('276_circle_weekly_prompt_metrics.sql') },
  @{ Out = '297_circle_weekly_prompts_cron.sql'; Header = 'Circle weekly prompt generation cron'; Sources = @('277_schedule_circle_weekly_prompt_generation.sql') },
  @{ Out = '298_feed_ranker_v4_seen_aware_rotation.sql'; Header = 'Feed ranker v4 seen-aware rotation'; Sources = @('278_feed_ranker_v4_seen_aware_rotation.sql') },
  @{ Out = '299_feed_interest_hashtag_synonyms.sql'; Header = 'Feed interest hashtag synonyms'; Sources = @('255_feed_interest_hashtag_synonyms.sql') },
  @{ Out = '300_username_check_rpc.sql'; Header = 'check_username_available RPC'; Sources = @('271_check_username_available_security_definer.sql') },
  @{ Out = '301_delete_own_account_rpc.sql'; Header = 'delete_own_account RPC'; Sources = @('272_delete_own_account_rpc.sql') },
  @{ Out = '302_june_2026_leaderboard_pulse_frames.sql'; Header = 'June 2026 leaderboard pulse frames'; Sources = @('253_june_2026_leaderboard_pulse_frames.sql') },
  @{ Out = '303_admin_economy_pipeline_summary.sql'; Header = 'Admin economy pipeline summary + final profile grants'; Sources = @('257_admin_economy_pipeline_summary.sql') }
)

foreach ($m in $maps) {
  Join-Migration -OutName $m.Out -Header $m.Header -Sources $m.Sources
}

# 291: migration 265 replaces post_profile_board_shoutout without owner notify from 261 — re-merge.
$patch291 = @'
-- ---------- reconcile: restore owner notify on post_profile_board_shoutout (261 + 265) ----------
create or replace function public.post_profile_board_shoutout(
  p_profile_owner_id uuid,
  p_body text
)
returns public.profile_board_shoutouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trimmed text;
  v_row public.profile_board_shoutouts;
  v_actor_name text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'empty shoutout' using errcode = '22000';
  end if;
  if char_length(v_trimmed) > 160 then
    raise exception 'shoutout too long' using errcode = '22000';
  end if;
  if v_trimmed ~* '(https?://|www\.)' then
    raise exception 'links not allowed' using errcode = '22000';
  end if;

  if v_user = p_profile_owner_id then
    raise exception 'self shoutouts not allowed' using errcode = '22000';
  end if;

  if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not coalesce(
    (select pr.pulse_board_enabled from public.profiles pr where pr.id = p_profile_owner_id),
    true
  ) then
    raise exception 'board disabled' using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '30 seconds'
      and s.status = 'active'
  ) then
    raise exception 'rate limited cooldown' using errcode = '22000';
  end if;

  if (
    select count(*)::int
    from public.profile_board_shoutouts s
    where s.author_id = v_user
      and s.profile_owner_id = p_profile_owner_id
      and s.created_at > now() - interval '1 hour'
      and s.status in ('active', 'hidden', 'reported', 'pending')
  ) >= 12 then
    raise exception 'rate limited hourly cap' using errcode = '22000';
  end if;

  insert into public.profile_board_shoutouts (profile_owner_id, author_id, body)
       values (p_profile_owner_id, v_user, v_trimmed)
    returning * into v_row;

  begin
    select coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.username), ''),
      'Someone'
    )
      into v_actor_name
    from public.profiles p
    where p.id = v_user;

    insert into public.notifications (user_id, actor_id, type, message, target_id, read)
    values (
      p_profile_owner_id,
      v_user,
      'pulse_board_shoutout',
      coalesce(v_actor_name, 'Someone') || ' left a Pulse on your board.',
      'pulse_board:' || p_profile_owner_id::text,
      false
    );
  exception when others then
    perform public.log_trigger_error(
      'post_profile_board_shoutout_notify',
      'INSERT',
      'profile_board_shoutouts',
      sqlstate,
      sqlerrm,
      jsonb_build_object(
        'profile_owner_id', p_profile_owner_id,
        'shoutout_id', v_row.id,
        'author_id', v_user
      )
    );
  end;

  return v_row;
end;
$$;

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;
'@

$path291 = Join-Path $dst '291_profile_board_retention_public_read_fixes.sql'
Add-Content -Path $path291 -Value "`n$patch291" -Encoding utf8

# 303: re-apply profile column grants after all WIP profile columns (284 staff_roles already on main).
$grant303 = @'

-- ---------- reconcile: final profiles column grants after WIP profile/board columns ----------
do $$
declare
  col_list text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into col_list
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name <> 'role_admin';

  execute 'revoke select on public.profiles from authenticated';
  execute format('grant select (%s) on public.profiles to authenticated', col_list);

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', col_list);
end $$;
'@

$path303 = Join-Path $dst '303_admin_economy_pipeline_summary.sql'
Add-Content -Path $path303 -Value $grant303 -Encoding utf8
