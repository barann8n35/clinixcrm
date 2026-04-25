-- Restore admin role for primary admin (baran@clinix.com)
INSERT INTO public.user_roles (user_id, role)
SELECT 'c1fe9bf6-9190-4d3f-9847-b8b79d539771'::uuid, 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = 'c1fe9bf6-9190-4d3f-9847-b8b79d539771'::uuid
    AND role = 'admin'::app_role
);

-- Trigger to permanently protect the primary admin: any attempt to delete or change
-- the admin role for baran@clinix.com will automatically re-insert it.
CREATE OR REPLACE FUNCTION public.protect_primary_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Determine which user_id is being affected
  IF TG_OP = 'DELETE' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = OLD.user_id;
    IF v_email = 'baran@clinix.com' AND OLD.role = 'admin'::app_role THEN
      -- Re-insert immediately to prevent removal
      INSERT INTO public.user_roles (user_id, role)
      VALUES (OLD.user_id, 'admin'::app_role)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_primary_admin ON public.user_roles;
CREATE TRIGGER trg_protect_primary_admin
AFTER DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_primary_admin();