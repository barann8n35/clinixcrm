-- Widget settings (singleton row)
CREATE TABLE IF NOT EXISTS public.widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL DEFAULT 'Clinix',
  welcome_message text NOT NULL DEFAULT 'Merhaba! Size nasıl yardımcı olabiliriz?',
  primary_color text NOT NULL DEFAULT '#0F172A',
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  ask_phone boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;

-- Public read (widget needs to load settings without auth)
CREATE POLICY "Public can read widget settings"
ON public.widget_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Admin can insert
CREATE POLICY "Admins can insert widget settings"
ON public.widget_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update
CREATE POLICY "Admins can update widget settings"
ON public.widget_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: auto update updated_at
CREATE TRIGGER update_widget_settings_updated_at
BEFORE UPDATE ON public.widget_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial row
INSERT INTO public.widget_settings (clinic_name, welcome_message, primary_color, is_active)
VALUES ('Clinix', 'Merhaba! Size nasıl yardımcı olabiliriz?', '#0F172A', true);