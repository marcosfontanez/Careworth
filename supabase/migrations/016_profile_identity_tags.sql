-- Custom neon-style pills on My Page (role/specialty fall back when empty)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.identity_tags IS 'Short labels shown as neon pills near avatar (e.g. RN, ICU, Night shifter); max ~8 in app';
