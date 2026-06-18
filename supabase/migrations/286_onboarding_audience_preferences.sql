-- ============================================================
-- Onboarding audience preferences
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 254_onboarding_audience_preferences.sql ----------
-- Broader-audience onboarding: audience role, interests (existing user_interests),
-- medical safety acknowledgment, creator audience tags, completion gate.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audience_role text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS medical_safety_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_audience_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.audience_role IS
  'Self-selected onboarding audience (healthcare_worker, caregiver_family, here_to_learn, â€¦). Not a verified clinical credential.';

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'When the user finished (or skipped) post-signup onboarding. NULL â†’ show onboarding after legal ack.';

COMMENT ON COLUMN public.profiles.medical_safety_acknowledged_at IS
  'User affirmed PulseVerse is not a substitute for professional medical care (caregiver/learn paths).';

COMMENT ON COLUMN public.profiles.creator_audience_tags IS
  'Optional creator tags: who this creator primarily makes content for (healthcare_workers, students, â€¦).';

-- Grandfather existing accounts so they are not forced through onboarding on deploy.
UPDATE public.profiles
SET onboarding_completed_at = COALESCE(terms_and_privacy_accepted_at, created_at, now())
WHERE onboarding_completed_at IS NULL
  AND terms_and_privacy_accepted_at IS NOT NULL;

-- Optional topic tags for Circle suggestion mapping (additive; empty = slug heuristics only).
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS onboarding_topics text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.communities.onboarding_topics IS
  'Topic tokens for onboarding Circle suggestions (humor, caregiver_support, career_exploration, â€¦).';

-- Seed public-safe onboarding topics on known starter Circles (best-effort slugs).
UPDATE public.communities SET onboarding_topics = ARRAY['humor', 'stories']::text[]
WHERE slug = 'memes' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['healthcare_workers', 'shift_stories', 'community']::text[]
WHERE slug = 'nurses' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['students', 'career_exploration', 'student_life']::text[]
WHERE slug = 'student-nurses' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['education', 'caregiver_support', 'patient_family', 'live_qa']::text[]
WHERE slug = 'simple-medical-questions' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['healthcare_workers', 'education']::text[]
WHERE slug = 'doctors' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['healthcare_workers']::text[]
WHERE slug = 'pct-cna' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['humor', 'stories']::text[]
WHERE slug = 'confessions' AND onboarding_topics = '{}';

UPDATE public.communities SET onboarding_topics = ARRAY['community', 'stories']::text[]
WHERE slug = 'gaming' AND onboarding_topics = '{}';

-- Re-apply column grants (247/250 pattern) so new profile columns are readable.
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


