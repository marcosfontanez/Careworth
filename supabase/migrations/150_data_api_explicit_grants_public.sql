-- Supabase Data API: explicit privileges for `public` schema
-- https://supabase.com/changelog (tables no longer auto-exposed to PostgREST / GraphQL)
--
-- Timeline (email May 2026): new projects default May 30, 2026; existing projects Oct 30, 2026.
-- Without these grants, new tables return PostgreSQL 42501 via /rest/v1.
--
-- This migration:
-- 1) Ensures current tables / sequences / routines used by the API have API-role grants (idempotent).
-- 2) Sets ALTER DEFAULT PRIVILEGES so objects created by migration owners keep the same behavior.

-- Schema visibility for API roles
grant usage on schema public to anon, authenticated, service_role;

-- Existing relations (tables, views, etc.)
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Sequences (serial / identity columns on insert)
grant usage, select on all sequences in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;

-- RPCs exposed through PostgREST
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Future objects: mirror historical Supabase defaults for roles that run migrations / DDL.
-- Hosted Supabase: session role `postgres` may not alter default privileges *for* `supabase_admin` (42501).
-- We always set `postgres`; we best-effort `supabase_admin` where privilege allows (e.g. self-hosted).

alter default privileges for role postgres in schema public grant select on tables to anon;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant usage, select on sequences to anon;
alter default privileges for role postgres in schema public grant usage, select on sequences to authenticated;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

do $$
declare
  r text := 'supabase_admin';
begin
  if exists (select 1 from pg_roles where pg_roles.rolname = r) then
  begin
    execute format('alter default privileges for role %I in schema public grant select on tables to anon', r);
    execute format(
      'alter default privileges for role %I in schema public grant select, insert, update, delete on tables to authenticated',
      r
    );
    execute format('alter default privileges for role %I in schema public grant all on tables to service_role', r);
    execute format(
      'alter default privileges for role %I in schema public grant usage, select on sequences to anon',
      r
    );
    execute format(
      'alter default privileges for role %I in schema public grant usage, select on sequences to authenticated',
      r
    );
    execute format('alter default privileges for role %I in schema public grant all on sequences to service_role', r);
    execute format(
      'alter default privileges for role %I in schema public grant execute on functions to anon, authenticated, service_role',
      r
    );
  exception
    when insufficient_privilege then
      raise notice 'migration 150: skipped alter default privileges for role % (insufficient privilege)', r;
  end;
  end if;
end $$;
