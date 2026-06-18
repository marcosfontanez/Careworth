-- ============================================================
-- delete_own_account RPC
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 272_delete_own_account_rpc.sql ----------
-- Self-service account deletion (App Store / Play requirement).
-- Deletes auth.users for the signed-in caller; profiles and most FKs cascade.
-- Callable from the client via supabase.rpc('delete_own_account').

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account IS
  'Hard-deletes the caller auth.users row (cascades profile and app data). Used by Settings â†’ Delete Account.';


