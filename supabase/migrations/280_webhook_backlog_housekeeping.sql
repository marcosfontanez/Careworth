-- Housekeeping: disable webhook_delivery until an external worker ships,
-- and ignore historical pending rows that were enqueued before delivery existed.

do $$
declare
  v_staff uuid;
  v_note constant text :=
    'Historical webhook backlog ignored because delivery worker was not live at time of enqueue.';
  r record;
  v_updated int := 0;
begin
  select id into v_staff
  from public.profiles
  where role_admin = true
  order by created_at asc
  limit 1;

  if v_staff is null then
    raise exception '280_webhook_backlog_cleanup: no staff profile for audit attribution';
  end if;

  update public.feature_flags
  set enabled = false,
      updated_at = now()
  where key = 'webhook_delivery';

  for r in
    select id, status, attempts
    from public.webhook_outbox
    where status = 'pending'
      and attempts = 0
      and last_attempted_at is null
      and created_at < now() - interval '1 hour'
  loop
    update public.webhook_outbox
    set status = 'ignored',
        last_error = null
    where id = r.id;

    insert into public.admin_audit_log (staff_user_id, action, entity_type, entity_id, metadata)
    values (
      v_staff,
      'webhook_outbox.ignore',
      'webhook_outbox',
      r.id::text,
      jsonb_build_object(
        'source_surface', 'migration',
        'previous_status', r.status,
        'new_status', 'ignored',
        'retry_count', coalesce(r.attempts, 0),
        'staff_note', v_note,
        'cleanup_batch', '280_webhook_backlog_housekeeping'
      )
    );

    v_updated := v_updated + 1;
  end loop;

  raise notice '280_webhook_backlog_cleanup: ignored % historical pending row(s)', v_updated;
end $$;
