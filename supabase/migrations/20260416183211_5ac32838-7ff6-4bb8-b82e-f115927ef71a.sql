-- 1. Add 'premium' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';

-- 2. Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_url TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'tr',
  duration_seconds INTEGER,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create video_translations table
CREATE TABLE public.video_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL,
  target_language_label TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'subtitle',
  status TEXT NOT NULL DEFAULT 'pending',
  output_url TEXT,
  subtitle_url TEXT,
  transcript_text TEXT,
  translated_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT video_translations_mode_check CHECK (mode IN ('subtitle', 'dub')),
  CONSTRAINT video_translations_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_video_translations_video_id ON public.video_translations(video_id);
CREATE INDEX idx_video_translations_status ON public.video_translations(status);

ALTER TABLE public.video_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own translations"
  ON public.video_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_translations.video_id
      AND (v.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert own translations"
  ON public.video_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_translations.video_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own translations"
  ON public.video_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_translations.video_id
      AND (v.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Service role can update translations"
  ON public.video_translations FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Users can delete own translations"
  ON public.video_translations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_translations.video_id
      AND (v.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 4. Realtime for video_translations
ALTER TABLE public.video_translations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_translations;

-- 5. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-videos', 'clinic-videos', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies (users access own folder: {user_id}/...)
CREATE POLICY "Users can view own videos in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinic-videos'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Users can upload videos to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own videos in storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own videos in storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-videos'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Service role can manage clinic videos"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'clinic-videos')
  WITH CHECK (bucket_id = 'clinic-videos');