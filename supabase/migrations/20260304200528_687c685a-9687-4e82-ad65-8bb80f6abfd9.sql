-- Drop dependent foreign key constraints before changing column types
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_patient_id_fkey;

ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- Convert patients primary key from uuid to text so external platform IDs (e.g. Telegram) can be stored directly
ALTER TABLE public.patients
ALTER COLUMN id DROP DEFAULT,
ALTER COLUMN id TYPE text USING id::text;

-- Convert referencing columns to text
ALTER TABLE public.messages
ALTER COLUMN patient_id TYPE text USING patient_id::text;

ALTER TABLE public.appointments
ALTER COLUMN patient_id TYPE text USING patient_id::text;

-- Recreate foreign key constraints against the new text primary key
ALTER TABLE public.messages
ADD CONSTRAINT messages_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;