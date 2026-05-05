
-- 1. clinic_schedule table
CREATE TABLE public.clinic_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  working_hours JSONB NOT NULL DEFAULT '{
    "mon":{"start":"09:00","end":"18:00"},
    "tue":{"start":"09:00","end":"18:00"},
    "wed":{"start":"09:00","end":"18:00"},
    "thu":{"start":"09:00","end":"18:00"},
    "fri":{"start":"09:00","end":"18:00"},
    "sat":{"start":"10:00","end":"14:00"},
    "sun":null
  }'::jsonb,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_schedule_select ON public.clinic_schedule FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY clinic_schedule_insert ON public.clinic_schedule FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY clinic_schedule_update ON public.clinic_schedule FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY clinic_schedule_delete ON public.clinic_schedule FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER clinic_schedule_updated_at
  BEFORE UPDATE ON public.clinic_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Slot conflict trigger on appointments
CREATE OR REPLACE FUNCTION public.check_appointment_slot_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE doctor = NEW.doctor
      AND scheduled_at = NEW.scheduled_at
      AND status <> 'cancelled'
      AND id <> NEW.id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Bu saat dolu. Lütfen başka bir slot seçin.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_slot_conflict ON public.appointments;
CREATE TRIGGER appointments_slot_conflict
  BEFORE INSERT OR UPDATE OF scheduled_at, doctor, status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_slot_conflict();

-- 3. get_available_slots RPC
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date DATE, p_doctor TEXT)
RETURNS TABLE(slot_time TEXT, is_available BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_schedule RECORD;
  v_day_key TEXT;
  v_day_config JSONB;
  v_start TIME;
  v_end TIME;
  v_slot_min INT;
  v_current TIME;
  v_slot_ts TIMESTAMPTZ;
  v_taken BOOLEAN;
BEGIN
  SELECT * INTO v_schedule FROM public.clinic_schedule WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    v_slot_min := 30;
    v_start := '09:00'::TIME;
    v_end := '18:00'::TIME;
  ELSE
    v_day_key := lower(to_char(p_date, 'dy'));
    v_day_config := v_schedule.working_hours -> v_day_key;
    IF v_day_config IS NULL OR v_day_config = 'null'::jsonb THEN
      RETURN;
    END IF;
    v_start := (v_day_config ->> 'start')::TIME;
    v_end := (v_day_config ->> 'end')::TIME;
    v_slot_min := v_schedule.slot_duration_minutes;
  END IF;

  v_current := v_start;
  WHILE v_current < v_end LOOP
    v_slot_ts := (p_date::TIMESTAMP + v_current)::TIMESTAMPTZ;
    SELECT EXISTS (
      SELECT 1 FROM public.appointments
      WHERE doctor = p_doctor
        AND scheduled_at = v_slot_ts
        AND status <> 'cancelled'
        AND user_id = v_user_id
    ) INTO v_taken;
    slot_time := to_char(v_current, 'HH24:MI');
    is_available := NOT v_taken;
    RETURN NEXT;
    v_current := v_current + (v_slot_min || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;
