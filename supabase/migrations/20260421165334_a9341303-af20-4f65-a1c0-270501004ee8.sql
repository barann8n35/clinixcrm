-- Track which appointment reminders have been sent to prevent duplicates
CREATE TABLE public.appointment_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, reminder_type)
);

CREATE INDEX idx_appointment_reminders_sent_appointment ON public.appointment_reminders_sent(appointment_id);

ALTER TABLE public.appointment_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read appointment_reminders_sent"
  ON public.appointment_reminders_sent FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manage appointment_reminders_sent"
  ON public.appointment_reminders_sent FOR ALL
  TO service_role USING (true) WITH CHECK (true);