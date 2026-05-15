-- Lock privilege columns on profiles so authenticated users cannot self-grant staff or verified
-- status via direct PostgREST / supabase-js (RLS "update own row" allows any column by default).

CREATE OR REPLACE FUNCTION public.profiles_lock_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.role() <> 'service_role' THEN
      NEW.role_admin := false;
      NEW.is_verified := false;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role_admin IS DISTINCT FROM OLD.role_admin
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      IF auth.role() = 'service_role' THEN
        RETURN NEW;
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND COALESCE(p.role_admin, false) = true
      ) THEN
        RETURN NEW;
      END IF;
      NEW.role_admin := OLD.role_admin;
      NEW.is_verified := OLD.is_verified;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_lock_privilege_columns ON public.profiles;
CREATE TRIGGER trg_profiles_lock_privilege_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_lock_privilege_columns();
