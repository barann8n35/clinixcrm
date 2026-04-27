-- Drop the old function and recreate with optional clinic_user_id parameter
DROP FUNCTION IF EXISTS public.handle_omnichannel_message(text, text, text, text);

CREATE OR REPLACE FUNCTION public.handle_omnichannel_message(
    p_platform text,
    p_external_id text,
    p_name text,
    p_message text,
    p_clinic_user_id uuid DEFAULT NULL
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
    -- Find existing patient scoped to clinic when provided
    IF p_platform = 'whatsapp' THEN
        v_cleaned_phone := regexp_replace(COALESCE(p_external_id, ''), '\D', '', 'g');
        SELECT id INTO v_patient_id 
        FROM patients 
        WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_cleaned_phone
          AND (p_clinic_user_id IS NULL OR user_id = p_clinic_user_id)
        LIMIT 1;
    ELSIF p_platform = 'instagram' THEN
        SELECT id INTO v_patient_id FROM patients 
        WHERE instagram_id = p_external_id
          AND (p_clinic_user_id IS NULL OR user_id = p_clinic_user_id)
        LIMIT 1;
    ELSIF p_platform = 'facebook' THEN
        SELECT id INTO v_patient_id FROM patients 
        WHERE facebook_id = p_external_id
          AND (p_clinic_user_id IS NULL OR user_id = p_clinic_user_id)
        LIMIT 1;
    ELSIF p_platform = 'web' THEN
        SELECT id INTO v_patient_id FROM patients 
        WHERE web_session_id = p_external_id
          AND (p_clinic_user_id IS NULL OR user_id = p_clinic_user_id)
        LIMIT 1;
    END IF;

    -- Create new patient if not found, attaching clinic ownership
    IF v_patient_id IS NULL THEN
        v_patient_id := concat('patient_', extract(epoch from now())::bigint);
        INSERT INTO patients (
            id, name, status, is_ai_active, platform, phone,
            instagram_id, facebook_id, web_session_id, user_id
        ) VALUES (
            v_patient_id, p_name, 'active', true, p_platform,
            CASE WHEN p_platform = 'whatsapp' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'instagram' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'facebook' THEN p_external_id ELSE NULL END,
            CASE WHEN p_platform = 'web' THEN p_external_id ELSE NULL END,
            p_clinic_user_id
        );
    END IF;

    -- Insert message scoped to clinic
    INSERT INTO messages (
        id, patient_id, sender_type, text, platform, is_processed, user_id
    ) VALUES (
        gen_random_uuid(), v_patient_id, 'patient', p_message, p_platform, false, p_clinic_user_id
    );

    RETURN v_patient_id;
END;
$function$;