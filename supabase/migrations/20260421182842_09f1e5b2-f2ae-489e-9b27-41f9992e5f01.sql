ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'personal'
  CHECK (scope IN ('personal', 'global'));

CREATE INDEX IF NOT EXISTS idx_notifications_scope ON public.notifications(scope);