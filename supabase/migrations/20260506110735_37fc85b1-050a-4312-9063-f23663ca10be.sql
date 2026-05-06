-- Admin can fully delete a user (for rejecting pending or removing active members)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Kendi hesabınızı silemezsiniz.';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _target_user_id;
  IF v_email = 'baran@clinix.com' THEN
    RAISE EXCEPTION 'Ana admin hesabı silinemez.';
  END IF;

  -- Remove role rows first to avoid protect_primary_admin re-insert side effects
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE user_id = _target_user_id;
  -- Finally remove from auth (cascades sessions etc.)
  DELETE FROM auth.users WHERE id = _target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;