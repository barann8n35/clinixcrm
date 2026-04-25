-- =========================================================
-- FIX SECURITY LINTER WARNINGS
-- =========================================================

-- 1) push_subscriptions: RLS kapalı, aç
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2) quick_replies: USING(true) politikalarını daralt
DROP POLICY IF EXISTS "Authenticated insert quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Authenticated update quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Authenticated delete quick_replies" ON public.quick_replies;
-- SELECT (USING true) kalıyor — paylaşımlı havuz, herkes okuyabilsin

CREATE POLICY "quick_replies_admin_insert" ON public.quick_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  );
CREATE POLICY "quick_replies_admin_update" ON public.quick_replies
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  );
CREATE POLICY "quick_replies_admin_delete" ON public.quick_replies
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Gereksiz service_role policy'lerini sil (service_role zaten RLS bypass eder)
DROP POLICY IF EXISTS "Service role manage appointment_reminders_sent" ON public.appointment_reminders_sent;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can update translations" ON public.video_translations;
DROP POLICY IF EXISTS "Service role manage voice_agent_settings" ON public.voice_agent_settings;
DROP POLICY IF EXISTS "Service role manage voice_calls" ON public.voice_calls;
DROP POLICY IF EXISTS "Service role can update voice clones" ON public.voice_clones;

-- 4) handle_omnichannel_message: search_path eksik
CREATE OR REPLACE FUNCTION public.handle_omnichannel_message(
  p_platform text, p_external_id text, p_name text, p_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_patient_id text;
    v_cleaned_phone text;
BEGIN
    IF p_platform = 'whatsapp' THEN
        v_cleaned_phone := regexp_replace(COALESCE(p_external_id, ''), '\D', '', 'g');
        SELECT id INTO v_patient_id 
        FROM patients 
        WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_cleaned_phone
        LIMIT 1;
    ELSIF p_platform = 'instagram' THEN
        SELECT id INTO v_patient_id FROM patients WHERE instagram_id = p_external_id LIMIT 1;
    ELSIF p_platform = 'facebook' THEN
        SELECT id INTO v_patient_id FROM patients WHERE facebook_id = p_external_id LIMIT 1;
    ELSIF p_platform = 'web' THEN
        SELECT id INTO v_patient_id FROM patients WHERE web_session_id = p_external_id LIMIT 1;
    END IF;

    IF v_patient_id IS NULL THEN
        v_patient_id := concat('patient_', extract(epoch from now())::bigint);
        INSERT INTO patients (
            id, name, status, is_ai_active, platform, phone,
            instagram_id, facebook_id, web_session_id
        ) VALUES (
            v_patient_id, p_name, 'active', true, p_platform,
            CASE WHEN p_platform = 'whatsapp' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'instagram' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'facebook' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'web' THEN p_external_id ELSE NULL END
        );
    END IF;

    INSERT INTO messages (
        id, patient_id, sender_type, text, platform, is_processed
    ) VALUES (
        gen_random_uuid(), v_patient_id, 'patient', p_message, p_platform, false
    );

    RETURN v_patient_id;
END;
$function$;