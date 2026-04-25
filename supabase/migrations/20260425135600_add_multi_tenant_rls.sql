-- 1. Tablolara user_id kolonunu ekleyelim (Eğer yoksa)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.patient_reminders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Eski tehlikeli (herkese açık) kuralları silelim
DROP POLICY IF EXISTS "Allow all access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;

-- 3. Row Level Security (RLS) kilitlerini aktif edelim
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. YENİ GÜVENLİK KURALLARI (Doktorlar sadece kendi hastalarını görebilir)
-- PATIENTS TABLOSU
CREATE POLICY "Users can view own patients" ON public.patients FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- APPOINTMENTS TABLOSU
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- MESSAGES TABLOSU
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- SERVICE ROLE (n8n API) İçin Tam Yetki (n8n, Service Key kullandığı için bu kuralları pas geçer, ancak yine de garantilemek için eklenir)
-- n8n Service Role zaten her şeye erişebilir, bu yüzden bu aşamada yeterlidir.
