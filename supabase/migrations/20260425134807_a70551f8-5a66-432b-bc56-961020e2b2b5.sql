-- =========================================================
-- MULTI-TENANT HARDENING: Klinik bazlı izolasyon
-- =========================================================

-- =========================================================
-- 1) PATIENTS / MESSAGES / APPOINTMENTS
--    Tehlikeli "USING(true)" ve public erişim politikalarını kaldır
-- =========================================================

-- patients
DROP POLICY IF EXISTS "Dev_Public_Access_Patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated read patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated update patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated delete patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;

-- messages
DROP POLICY IF EXISTS "Dev_Public_Access_Messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated insert messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated update messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated delete messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;

-- appointments
DROP POLICY IF EXISTS "Dev_Public_Access_Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;

-- KVKK appointments politikaları (eski migration'da messages/patients için yazılmış ama appointments yok)
-- Eklenir (idempotent: önce drop)
DROP POLICY IF EXISTS "kvkk_appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "kvkk_appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "kvkk_appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "kvkk_appointments_delete" ON public.appointments;

CREATE POLICY "kvkk_appointments_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kvkk_appointments_insert" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kvkk_appointments_update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kvkk_appointments_delete" ON public.appointments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 2) ESKİ VERİLERİ "BOŞA AL" — sadece admin görsün
--    (kullanıcı tercihi: ilk admine atanmış eski kayıtların user_id'sini NULL yap)
--    NOT: KVKK migration'ı her satırı ilk auth.users kullanıcısına bağlamıştı.
--    Sadece o ilk admin atamasını geri al; yeni insert'ler etkilenmez.
-- =========================================================
DO $$
DECLARE
  v_first_user uuid;
BEGIN
  SELECT id INTO v_first_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_first_user IS NOT NULL THEN
    -- Eski toplu atamayı geri al; sonradan eklenen kayıtlar zaten gerçek user_id ile geldi.
    UPDATE public.patients SET user_id = NULL
      WHERE user_id = v_first_user
        AND created_at < '2026-04-25'::timestamptz;
    UPDATE public.messages SET user_id = NULL
      WHERE user_id = v_first_user
        AND created_at < '2026-04-25'::timestamptz;
    UPDATE public.appointments SET user_id = NULL
      WHERE user_id = v_first_user
        AND created_at < '2026-04-25'::timestamptz;
  END IF;
END $$;

-- NULL user_id'li satırlara sadece admin erişebilsin diye KVKK select policy'lerini güncelle
DROP POLICY IF EXISTS "kvkk_patients_select" ON public.patients;
CREATE POLICY "kvkk_patients_select" ON public.patients
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "kvkk_messages_select" ON public.messages;
CREATE POLICY "kvkk_messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =========================================================
-- 3) VOICE_CALLS — tenant izolasyonu
-- =========================================================
ALTER TABLE public.voice_calls
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Mevcut kayıtlarda initiated_by varsa onu user_id olarak kullan
UPDATE public.voice_calls
  SET user_id = initiated_by
  WHERE user_id IS NULL AND initiated_by IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated read voice_calls" ON public.voice_calls;
DROP POLICY IF EXISTS "Authenticated insert voice_calls" ON public.voice_calls;
DROP POLICY IF EXISTS "Authenticated update voice_calls" ON public.voice_calls;

DROP POLICY IF EXISTS "kvkk_voice_calls_select" ON public.voice_calls;
DROP POLICY IF EXISTS "kvkk_voice_calls_insert" ON public.voice_calls;
DROP POLICY IF EXISTS "kvkk_voice_calls_update" ON public.voice_calls;

CREATE POLICY "kvkk_voice_calls_select" ON public.voice_calls
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR auth.uid() = initiated_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "kvkk_voice_calls_insert" ON public.voice_calls
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = initiated_by);
CREATE POLICY "kvkk_voice_calls_update" ON public.voice_calls
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = initiated_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_voice_calls_user_id ON public.voice_calls(user_id);

-- =========================================================
-- 4) PATIENT_REMINDERS — tenant izolasyonu
-- =========================================================
DROP POLICY IF EXISTS "Authenticated read patient_reminders" ON public.patient_reminders;
DROP POLICY IF EXISTS "Authenticated insert patient_reminders" ON public.patient_reminders;
DROP POLICY IF EXISTS "Authenticated update patient_reminders" ON public.patient_reminders;
DROP POLICY IF EXISTS "Authenticated delete patient_reminders" ON public.patient_reminders;

DROP POLICY IF EXISTS "kvkk_reminders_select" ON public.patient_reminders;
DROP POLICY IF EXISTS "kvkk_reminders_insert" ON public.patient_reminders;
DROP POLICY IF EXISTS "kvkk_reminders_update" ON public.patient_reminders;
DROP POLICY IF EXISTS "kvkk_reminders_delete" ON public.patient_reminders;

CREATE POLICY "kvkk_reminders_select" ON public.patient_reminders
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "kvkk_reminders_insert" ON public.patient_reminders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kvkk_reminders_update" ON public.patient_reminders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kvkk_reminders_delete" ON public.patient_reminders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_patient_reminders_user_id ON public.patient_reminders(user_id);

-- =========================================================
-- 5) LEARNING_LOGS — tenant izolasyonu
-- =========================================================
ALTER TABLE public.learning_logs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Authenticated read learning_logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Authenticated insert learning_logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Authenticated update learning_logs" ON public.learning_logs;
DROP POLICY IF EXISTS "Authenticated delete learning_logs" ON public.learning_logs;

DROP POLICY IF EXISTS "kvkk_learning_select" ON public.learning_logs;
DROP POLICY IF EXISTS "kvkk_learning_insert" ON public.learning_logs;
DROP POLICY IF EXISTS "kvkk_learning_update" ON public.learning_logs;
DROP POLICY IF EXISTS "kvkk_learning_delete" ON public.learning_logs;

CREATE POLICY "kvkk_learning_select" ON public.learning_logs
  FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "kvkk_learning_insert" ON public.learning_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kvkk_learning_update" ON public.learning_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kvkk_learning_delete" ON public.learning_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_learning_logs_user_id ON public.learning_logs(user_id);

-- =========================================================
-- 6) VOICE_AGENT_SETTINGS — klinik bazlı
-- =========================================================
ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Mevcut tek satırı ilk admin'e bağla
DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT ur.user_id INTO v_admin
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::app_role
    ORDER BY ur.user_id LIMIT 1;
  IF v_admin IS NOT NULL THEN
    UPDATE public.voice_agent_settings SET user_id = v_admin WHERE user_id IS NULL;
  END IF;
END $$;

-- Her klinik için unique
CREATE UNIQUE INDEX IF NOT EXISTS uniq_voice_agent_settings_user
  ON public.voice_agent_settings(user_id);

DROP POLICY IF EXISTS "Authenticated read voice_agent_settings" ON public.voice_agent_settings;
DROP POLICY IF EXISTS "Admins insert voice_agent_settings" ON public.voice_agent_settings;
DROP POLICY IF EXISTS "Admins update voice_agent_settings" ON public.voice_agent_settings;

DROP POLICY IF EXISTS "voice_agent_settings_select_own" ON public.voice_agent_settings;
DROP POLICY IF EXISTS "voice_agent_settings_insert_own" ON public.voice_agent_settings;
DROP POLICY IF EXISTS "voice_agent_settings_update_own" ON public.voice_agent_settings;

CREATE POLICY "voice_agent_settings_select_own" ON public.voice_agent_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "voice_agent_settings_insert_own" ON public.voice_agent_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_agent_settings_update_own" ON public.voice_agent_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 7) WIDGET_SETTINGS — klinik bazlı
-- =========================================================
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT ur.user_id INTO v_admin
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::app_role
    ORDER BY ur.user_id LIMIT 1;
  IF v_admin IS NOT NULL THEN
    UPDATE public.widget_settings SET user_id = v_admin WHERE user_id IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_widget_settings_user
  ON public.widget_settings(user_id);

-- Public read'i koru (widget anonim olarak yüklenebilmeli)
-- Ama insert/update sadece sahibi (veya admin) olabilir
DROP POLICY IF EXISTS "Admins can insert widget settings" ON public.widget_settings;
DROP POLICY IF EXISTS "Admins can update widget settings" ON public.widget_settings;

DROP POLICY IF EXISTS "widget_settings_insert_own" ON public.widget_settings;
DROP POLICY IF EXISTS "widget_settings_update_own" ON public.widget_settings;

CREATE POLICY "widget_settings_insert_own" ON public.widget_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "widget_settings_update_own" ON public.widget_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
