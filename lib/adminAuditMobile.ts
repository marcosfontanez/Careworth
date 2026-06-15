import { supabase } from '@/lib/supabase';

type MobileAdminAuditArgs = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append-only audit row for mobile admin mutations.
 * Requires staff session — RLS enforces auth.uid() = staff_user_id and role_admin.
 */
export async function writeMobileAdminAudit(args: MobileAdminAuditArgs): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;

  const { error } = await supabase.from('admin_audit_log').insert({
    staff_user_id: user.id,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId ?? null,
    metadata: {
      source_surface: 'mobile',
      timestamp: new Date().toISOString(),
      ...(args.metadata ?? {}),
    },
  });

  if (error) {
    console.warn('[writeMobileAdminAudit]', error.message);
  }
}
