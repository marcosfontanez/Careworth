-- Unique @handle for profiles (lowercase in app). Used for My Page line + @mentions in posts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

COMMENT ON COLUMN public.profiles.username IS 'Public handle without @; unique; lowercase recommended';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL AND length(trim(username)) > 0;
