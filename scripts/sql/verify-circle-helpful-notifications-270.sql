-- Helpful reply notifications — migration 270 verification
-- Run: npx supabase db query --linked -f scripts/sql/verify-circle-helpful-notifications-270.sql

select json_build_object(
  'migration_270_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '270'),
  'notify_fn_exists',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'notify_on_circle_reply_helpful'
  ),
  'notify_trigger_exists',
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'circle_reply_reactions'
      and t.tgname = 'trg_circle_reply_reactions_notify_helpful'
      and not t.tgisinternal
  ),
  'trigger_insert_only',
  coalesce(
    (select pg_get_triggerdef(t.oid) like '%INSERT%'
     from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'circle_reply_reactions'
       and t.tgname = 'trg_circle_reply_reactions_notify_helpful'
     limit 1),
    false
  ),
  'fn_skips_self_and_blocks',
  coalesce(
    (select prosrc like '%v_reply_author = new.user_id%'
        and prosrc like '%blocked_users%'
        and prosrc like '%community_is_confessions%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'notify_on_circle_reply_helpful' limit 1),
    false
  )
) as circle_helpful_notifications_270_check;
