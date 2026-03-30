ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS internal_notes text DEFAULT '';