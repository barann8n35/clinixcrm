
CREATE OR REPLACE FUNCTION public.set_clinic_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_membership_count int;
  v_owner uuid;
BEGIN
  -- Count memberships for the current user
  SELECT count(*) INTO v_membership_count
  FROM public.clinic_members
  WHERE member_user_id = auth.uid();

  -- Only auto-assign when user is a member of EXACTLY ONE clinic.
  -- Multi-clinic members must explicitly set user_id (active clinic switcher).
  IF v_membership_count = 1 THEN
    SELECT owner_user_id INTO v_owner
    FROM public.clinic_members
    WHERE member_user_id = auth.uid()
    LIMIT 1;
    IF v_owner IS NOT NULL THEN
      NEW.user_id := v_owner;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
