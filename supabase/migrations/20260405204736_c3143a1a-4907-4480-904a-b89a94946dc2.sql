
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS reminder_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_date timestamptz;
