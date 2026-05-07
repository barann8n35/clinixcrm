ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS examination_notes text DEFAULT '',
ADD COLUMN IF NOT EXISTS epicrisis text DEFAULT '';