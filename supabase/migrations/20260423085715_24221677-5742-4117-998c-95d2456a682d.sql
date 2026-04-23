-- ========================================
-- VOICE CALLS TABLE
-- ========================================
CREATE TABLE public.voice_calls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  call_type text NOT NULL DEFAULT 'manual' CHECK (call_type IN (
    'manual','lead_welcome','appointment_reminder_24h','appointment_reminder_1h','unanswered_followup','inbound'
  )),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','initiated','ringing','in-progress','completed','busy','no-answer','failed','canceled'
  )),
  twilio_call_sid text,
  conversation_id text,
  recording_url text,
  transcript text,
  summary text,
  duration_seconds integer,
  error_message text,
  to_number text,
  from_number text,
  initiated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_voice_calls_patient_id ON public.voice_calls(patient_id);
CREATE INDEX idx_voice_calls_appointment_id ON public.voice_calls(appointment_id);
CREATE INDEX idx_voice_calls_status ON public.voice_calls(status);
CREATE INDEX idx_voice_calls_twilio_sid ON public.voice_calls(twilio_call_sid);

ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read voice_calls"
  ON public.voice_calls FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated insert voice_calls"
  ON public.voice_calls FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update voice_calls"
  ON public.voice_calls FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role manage voice_calls"
  ON public.voice_calls FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_calls_updated_at
  BEFORE UPDATE ON public.voice_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- VOICE AGENT SETTINGS TABLE
-- ========================================
CREATE TABLE public.voice_agent_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name text NOT NULL DEFAULT 'Clinix',
  doctor_name text NOT NULL DEFAULT 'Dr. İlhan Elmacı',
  agent_persona text NOT NULL DEFAULT 'Sıcak, profesyonel, kısa ve net konuşan bir klinik resepsiyonisti.',
  greeting_message text NOT NULL DEFAULT 'Merhaba, ben Clinix asistanı. Size nasıl yardımcı olabilirim?',
  voice_id text NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  language text NOT NULL DEFAULT 'tr',
  auto_call_new_leads boolean NOT NULL DEFAULT false,
  auto_call_appointment_reminders boolean NOT NULL DEFAULT false,
  auto_call_unanswered_messages boolean NOT NULL DEFAULT false,
  unanswered_threshold_minutes integer NOT NULL DEFAULT 30,
  daily_call_limit integer NOT NULL DEFAULT 100,
  call_window_start time NOT NULL DEFAULT '09:00',
  call_window_end time NOT NULL DEFAULT '20:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read voice_agent_settings"
  ON public.voice_agent_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins update voice_agent_settings"
  ON public.voice_agent_settings FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert voice_agent_settings"
  ON public.voice_agent_settings FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manage voice_agent_settings"
  ON public.voice_agent_settings FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_agent_settings_updated_at
  BEFORE UPDATE ON public.voice_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a single default settings row
INSERT INTO public.voice_agent_settings DEFAULT VALUES;