
ALTER TABLE public.learning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read learning_logs"
  ON public.learning_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert learning_logs"
  ON public.learning_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update learning_logs"
  ON public.learning_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete learning_logs"
  ON public.learning_logs
  FOR DELETE
  TO authenticated
  USING (true);
