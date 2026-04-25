-- =============================================
-- KVKK Multi-Tenant RLS Migration
-- Her doktor/kullanıcı SADECE kendi hastalarını,
-- mesajlarını ve randevularını görebilir.
-- =============================================

-- 1. patients tablosuna user_id kolonu ekle
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Mevcut kayıtları ilk admin kullanıcıya bağla (veri kaybı olmasın)
UPDATE public.patients
  SET user_id = (SELECT id FROM auth.users LIMIT 1)
  WHERE user_id IS NULL;

-- 2. messages tablosuna user_id kolonu ekle
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.messages
  SET user_id = (
    SELECT p.user_id FROM public.patients p WHERE p.id = messages.patient_id
  )
  WHERE user_id IS NULL;

-- 3. appointments tablosuna user_id kolonu ekle
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.appointments
  SET user_id = (
    SELECT p.user_id FROM public.patients p WHERE p.id = appointments.patient_id
  )
  WHERE user_id IS NULL;

-- =============================================
-- 4. Eski "Allow all" politikalarını kaldır
-- =============================================
DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;

-- =============================================
-- 5. Yeni KVKK-uyumlu RLS politikaları
-- Her kullanıcı sadece kendi verisini görür/düzenler
-- Admin'ler tüm verilere erişebilir
-- =============================================

-- PATIENTS
CREATE POLICY "kvkk_patients_select"
  ON public.patients FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_patients_insert"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kvkk_patients_update"
  ON public.patients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_patients_delete"
  ON public.patients FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- MESSAGES
CREATE POLICY "kvkk_messages_select"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_messages_insert"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kvkk_messages_update"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_messages_delete"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- APPOINTMENTS
CREATE POLICY "kvkk_appointments_select"
  ON public.appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_appointments_insert"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kvkk_appointments_update"
  ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kvkk_appointments_delete"
  ON public.appointments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 6. Service role bypass — n8n ve Edge Functions
-- service_role key ile bağlanan servisler RLS'i
-- otomatik olarak bypass eder, ek politika gerekmez.
-- =============================================

-- 7. Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
