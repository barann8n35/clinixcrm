ALTER TABLE public.video_translations ADD COLUMN IF NOT EXISTS source_duration_seconds numeric;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds numeric;