CREATE OR REPLACE FUNCTION public.can_post_global_notification(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'doctor'::app_role, 'asistan'::app_role, 'premium'::app_role, 'premium_plus'::app_role)
  )
$$;