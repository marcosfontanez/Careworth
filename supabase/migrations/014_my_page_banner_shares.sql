-- My Page banner image + aggregate share count for profile stats
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS total_shares integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.banner_url IS 'Wide header image for My Page (recommended min 1200×400, ~3:1)';
COMMENT ON COLUMN public.profiles.total_shares IS 'Roll-up of shares across user posts/profile (displayed as Shares on My Page)';
