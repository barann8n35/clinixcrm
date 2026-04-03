
CREATE TABLE public.patient_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_reminders"
  ON public.patient_reminders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated insert patient_reminders"
  ON public.patient_reminders FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update patient_reminders"
  ON public.patient_reminders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete patient_reminders"
  ON public.patient_reminders FOR DELETE
  TO authenticated USING (true);

CREATE INDEX idx_patient_reminders_patient ON public.patient_reminders(patient_id);
CREATE INDEX idx_patient_reminders_remind_at ON public.patient_reminders(remind_at);
