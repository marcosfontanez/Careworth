-- Post-smoke cleanup: deactivate internal test destinations, ignore test rows, disable delivery flag.

update public.webhook_destinations
set is_active = false, updated_at = now()
where name like 'Internal test%';

update public.webhook_outbox
set status = 'ignored', last_error = null
where event_type in ('test.ping', 'test.ping.fail');

update public.feature_flags
set enabled = false, updated_at = now()
where key = 'webhook_delivery';

select key, enabled from public.feature_flags where key = 'webhook_delivery';
select name, is_active from public.webhook_destinations where name like 'Internal test%';
select event_type, status, count(*) from public.webhook_outbox
where event_type in ('test.ping', 'test.ping.fail')
group by event_type, status;
