-- Stop advertising every account as RN / General. Identity is driven by `identity_tags` (neon pills).

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT '',
  ALTER COLUMN specialty SET DEFAULT '';

-- Clear the legacy signup default pair still stored on older rows.
UPDATE public.profiles
SET role = '', specialty = ''
WHERE lower(trim(coalesce(role, ''))) = 'rn'
  AND lower(trim(coalesce(specialty, ''))) = 'general';

COMMENT ON COLUMN public.profiles.role IS
  'Deprecated clinician role label for backward-compat reads only; prefer identity_tags for public identity.';
COMMENT ON COLUMN public.profiles.specialty IS
  'Deprecated specialty label; prefer identity_tags for public identity.';

-- Denormalized post fields: avoid DB-level RN/General when the client omits these on insert.
ALTER TABLE public.posts
  ALTER COLUMN role_context SET DEFAULT '',
  ALTER COLUMN specialty_context SET DEFAULT '';
