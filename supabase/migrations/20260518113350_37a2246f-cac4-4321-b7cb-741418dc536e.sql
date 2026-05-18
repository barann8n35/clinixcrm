
-- 1. clinic_members table
CREATE TABLE IF NOT EXISTS public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'secretary', -- 'doctor' | 'secretary' | 'asistan'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, member_user_id)
);

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage clinic_members"
  ON public.clinic_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view own memberships"
  ON public.clinic_members FOR SELECT
  TO authenticated
  USING (auth.uid() = member_user_id OR auth.uid() = owner_user_id);

-- 2. helper functions
CREATE OR REPLACE FUNCTION public.is_clinic_member(_user uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE member_user_id = _user AND owner_user_id = _owner
  )
$$;

CREATE OR REPLACE FUNCTION public.clinic_owner_for(_user uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_user_id FROM public.clinic_members
  WHERE member_user_id = _user
  LIMIT 1
$$;

-- 3. trigger: auto-rewrite user_id to clinic owner when a member inserts
CREATE OR REPLACE FUNCTION public.set_clinic_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  v_owner := public.clinic_owner_for(auth.uid());
  IF v_owner IS NOT NULL THEN
    NEW.user_id := v_owner;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Update RLS on shared tables to include clinic membership
-- PATIENTS
DROP POLICY IF EXISTS kvkk_patients_select ON public.patients;
DROP POLICY IF EXISTS kvkk_patients_insert ON public.patients;
DROP POLICY IF EXISTS kvkk_patients_update ON public.patients;
DROP POLICY IF EXISTS kvkk_patients_delete ON public.patients;

CREATE POLICY kvkk_patients_select ON public.patients FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_patients_insert ON public.patients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY kvkk_patients_update ON public.patients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_patients_delete ON public.patients FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_set_clinic_owner_patients ON public.patients;
CREATE TRIGGER trg_set_clinic_owner_patients
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_owner_on_insert();

-- APPOINTMENTS
DROP POLICY IF EXISTS kvkk_appointments_select ON public.appointments;
DROP POLICY IF EXISTS kvkk_appointments_insert ON public.appointments;
DROP POLICY IF EXISTS kvkk_appointments_update ON public.appointments;
DROP POLICY IF EXISTS kvkk_appointments_delete ON public.appointments;

CREATE POLICY kvkk_appointments_select ON public.appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_appointments_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY kvkk_appointments_update ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_appointments_delete ON public.appointments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_set_clinic_owner_appointments ON public.appointments;
CREATE TRIGGER trg_set_clinic_owner_appointments
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_owner_on_insert();

-- MESSAGES
DROP POLICY IF EXISTS kvkk_messages_select ON public.messages;
DROP POLICY IF EXISTS kvkk_messages_insert ON public.messages;
DROP POLICY IF EXISTS kvkk_messages_update ON public.messages;
DROP POLICY IF EXISTS kvkk_messages_delete ON public.messages;

CREATE POLICY kvkk_messages_select ON public.messages FOR SELECT TO authenticated
  USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY kvkk_messages_update ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_messages_delete ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_set_clinic_owner_messages ON public.messages;
CREATE TRIGGER trg_set_clinic_owner_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_owner_on_insert();

-- PATIENT REMINDERS
DROP POLICY IF EXISTS kvkk_reminders_select ON public.patient_reminders;
DROP POLICY IF EXISTS kvkk_reminders_insert ON public.patient_reminders;
DROP POLICY IF EXISTS kvkk_reminders_update ON public.patient_reminders;
DROP POLICY IF EXISTS kvkk_reminders_delete ON public.patient_reminders;

CREATE POLICY kvkk_reminders_select ON public.patient_reminders FOR SELECT TO authenticated
  USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_reminders_insert ON public.patient_reminders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY kvkk_reminders_update ON public.patient_reminders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_reminders_delete ON public.patient_reminders FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_set_clinic_owner_reminders ON public.patient_reminders;
CREATE TRIGGER trg_set_clinic_owner_reminders
  BEFORE INSERT ON public.patient_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_owner_on_insert();

-- LEARNING LOGS
DROP POLICY IF EXISTS kvkk_learning_select ON public.learning_logs;
DROP POLICY IF EXISTS kvkk_learning_insert ON public.learning_logs;
DROP POLICY IF EXISTS kvkk_learning_update ON public.learning_logs;
DROP POLICY IF EXISTS kvkk_learning_delete ON public.learning_logs;

CREATE POLICY kvkk_learning_select ON public.learning_logs FOR SELECT TO authenticated
  USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_learning_insert ON public.learning_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_learning_update ON public.learning_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_learning_delete ON public.learning_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- CLINICAL TEMPLATES
DROP POLICY IF EXISTS ct_select ON public.clinical_templates;
DROP POLICY IF EXISTS ct_insert ON public.clinical_templates;
DROP POLICY IF EXISTS ct_update ON public.clinical_templates;
DROP POLICY IF EXISTS ct_delete ON public.clinical_templates;

CREATE POLICY ct_select ON public.clinical_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY ct_insert ON public.clinical_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY ct_update ON public.clinical_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY ct_delete ON public.clinical_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_set_clinic_owner_templates ON public.clinical_templates;
CREATE TRIGGER trg_set_clinic_owner_templates
  BEFORE INSERT ON public.clinical_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_clinic_owner_on_insert();

-- CLINIC SCHEDULE
DROP POLICY IF EXISTS clinic_schedule_select ON public.clinic_schedule;
DROP POLICY IF EXISTS clinic_schedule_insert ON public.clinic_schedule;
DROP POLICY IF EXISTS clinic_schedule_update ON public.clinic_schedule;
DROP POLICY IF EXISTS clinic_schedule_delete ON public.clinic_schedule;

CREATE POLICY clinic_schedule_select ON public.clinic_schedule FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY clinic_schedule_insert ON public.clinic_schedule FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY clinic_schedule_update ON public.clinic_schedule FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY clinic_schedule_delete ON public.clinic_schedule FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- VOICE CALLS
DROP POLICY IF EXISTS kvkk_voice_calls_select ON public.voice_calls;
DROP POLICY IF EXISTS kvkk_voice_calls_insert ON public.voice_calls;
DROP POLICY IF EXISTS kvkk_voice_calls_update ON public.voice_calls;

CREATE POLICY kvkk_voice_calls_select ON public.voice_calls FOR SELECT TO authenticated
  USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR auth.uid() = initiated_by OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY kvkk_voice_calls_insert ON public.voice_calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = initiated_by OR public.is_clinic_member(auth.uid(), user_id));
CREATE POLICY kvkk_voice_calls_update ON public.voice_calls FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = initiated_by OR public.is_clinic_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin'::app_role));
