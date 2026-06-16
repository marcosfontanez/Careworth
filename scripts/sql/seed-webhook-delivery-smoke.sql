-- Webhook delivery smoke: test destination + pending event (run before enabling webhook_delivery).

insert into public.webhook_destinations (name, url, event_types, is_active, metadata)
values (
  'Internal test (httpbin)',
  'https://httpbin.org/post',
  array['test.ping']::text[],
  true,
  '{}'::jsonb
)
on conflict do nothing;

-- Use latest httpbin destination if re-running
insert into public.webhook_outbox (event_type, payload, status)
values (
  'test.ping',
  '{"topic":"worker-smoke","token":"must-not-leak"}'::jsonb,
  'pending'
);

select id, name, url, is_active from public.webhook_destinations where name like 'Internal test%';
select id, event_type, status, attempts from public.webhook_outbox where event_type = 'test.ping' order by created_at desc limit 1;
