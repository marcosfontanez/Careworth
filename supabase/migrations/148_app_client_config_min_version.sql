-- Remote minimum native app version (read by mobile clients). Bump `min_app_version` when you ship breaking changes.
CREATE TABLE IF NOT EXISTS public.app_client_config (
  id integer PRIMARY KEY DEFAULT 1,
  CONSTRAINT app_client_config_singleton CHECK (id = 1),
  min_app_version text NOT NULL DEFAULT '1.0.0',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_client_config (id, min_app_version)
VALUES (1, '1.0.0')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_client_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_client_config_select_public"
  ON public.app_client_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.app_client_config IS
  'Mobile reads min_app_version (semver-like); increment to force older installs to update via AppMinimumVersionGate.';
