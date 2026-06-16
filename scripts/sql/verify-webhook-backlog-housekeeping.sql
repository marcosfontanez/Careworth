-- Post-280 verification: flag off, backlog ignored, audit present.

select key, enabled, updated_at
from public.feature_flags
where key = 'webhook_delivery';

select status, count(*) as cnt
from public.webhook_outbox
group by status
order by status;

select count(*) as stale_pending
from public.webhook_outbox
where status = 'pending'
  and created_at < now() - interval '1 hour';

select
  action,
  entity_id,
  metadata->>'source_surface' as source_surface,
  metadata->>'staff_note' as staff_note,
  metadata->>'cleanup_batch' as cleanup_batch,
  created_at
from public.admin_audit_log
where entity_type = 'webhook_outbox'
  and metadata->>'cleanup_batch' = '280_webhook_backlog_housekeeping'
order by created_at desc
limit 20;
