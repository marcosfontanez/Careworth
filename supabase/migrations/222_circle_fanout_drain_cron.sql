-- Legacy circle post notification fan-out drain (migration 220).
-- Migration 221 digest supersedes new large-circle per-post enqueue; this cron
-- only drains rows already pending in circle_post_notification_fanout.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'circle-post-notification-fanout-drain';

    perform cron.schedule(
      'circle-post-notification-fanout-drain',
      '*/5 * * * *',
      $cron$ select public.process_circle_post_notification_fanout(10); $cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$$;

comment on function public.process_circle_post_notification_fanout(int) is
  'Drains legacy circle_post_notification_fanout jobs (pre-digest). Scheduled by migration 222 when pg_cron is available.';
