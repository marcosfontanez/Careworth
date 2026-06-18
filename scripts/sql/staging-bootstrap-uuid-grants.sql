-- Staging follow-up: allow authenticated inserts that default uuid columns.
GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION extensions.uuid_generate_v4() TO authenticated, anon, service_role;
