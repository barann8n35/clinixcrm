CREATE TABLE public.clinical_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL CHECK (category IN ('examination','epicrisis')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY ct_select ON public.clinical_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY ct_insert ON public.clinical_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY ct_update ON public.clinical_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY ct_delete ON public.clinical_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER ct_set_updated_at BEFORE UPDATE ON public.clinical_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ct_user_cat ON public.clinical_templates(user_id, category, sort_order);