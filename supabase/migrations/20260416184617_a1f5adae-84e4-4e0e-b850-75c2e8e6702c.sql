-- 1) Add premium_plus role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium_plus';

-- 2) voice_clones table
CREATE TABLE IF NOT EXISTS public.voice_clones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Voice',
  elevenlabs_voice_id text,
  sample_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | ready | failed
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice clones"
  ON public.voice_clones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own voice clones"
  ON public.voice_clones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice clones"
  ON public.voice_clones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can update voice clones"
  ON public.voice_clones FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Users can delete own voice clones"
  ON public.voice_clones FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_voice_clones_updated_at
  BEFORE UPDATE ON public.voice_clones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Add lipsync output columns to video_translations
ALTER TABLE public.video_translations
  ADD COLUMN IF NOT EXISTS voice_clone_id uuid REFERENCES public.voice_clones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lipsync_url text,
  ADD COLUMN IF NOT EXISTS lipsync_job_id text;

-- 4) Realtime for voice_clones
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_clones;