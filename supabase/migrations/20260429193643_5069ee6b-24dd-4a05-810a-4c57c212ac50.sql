-- 1) Sahipsiz eski kayıtları primary admin'e ata
UPDATE public.patients
   SET user_id = 'c1fe9bf6-9190-4d3f-9847-b8b79d539771'::uuid
 WHERE user_id IS NULL;

UPDATE public.appointments
   SET user_id = 'c1fe9bf6-9190-4d3f-9847-b8b79d539771'::uuid
 WHERE user_id IS NULL;

-- 2) user_id artık NOT NULL olsun + default = auth.uid()
ALTER TABLE public.patients
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.appointments
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;