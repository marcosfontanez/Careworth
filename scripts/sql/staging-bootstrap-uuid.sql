-- Staging bootstrap: Supabase PG17 installs uuid-ossp in extensions schema.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
PARALLEL SAFE
AS $$ SELECT extensions.uuid_generate_v4() $$;
