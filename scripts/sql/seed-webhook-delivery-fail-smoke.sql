insert into public.webhook_destinations (name, url, event_types, is_active)
values ('Internal test fail', 'https://httpbin.org/status/500', array['test.ping.fail']::text[], true);

insert into public.webhook_outbox (event_type, payload, status)
values ('test.ping.fail', '{"topic":"fail-smoke"}'::jsonb, 'pending');

select id, event_type, status, attempts from public.webhook_outbox
where event_type = 'test.ping.fail'
order by created_at desc
limit 1;
