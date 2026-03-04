
-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  complaint TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  platform TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Consultation',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'ai', 'secretary')),
  text TEXT NOT NULL,
  platform TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated and anon access (before auth is set up)
-- These should be tightened once authentication is implemented
CREATE POLICY "Allow all access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Seed sample patients
INSERT INTO public.patients (id, name, phone, complaint, location, status, platform) VALUES
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'Büşra Zeydan', '+90 555 234 ****', 'Back pain', 'Istanbul, Turkey', 'pending', 'whatsapp'),
  ('a1b2c3d4-2222-4a7b-b2e1-9c3f4d5a6e7b', 'Mehmet Kaya', '+90 555 345 ****', 'Knee pain', 'Ankara, Turkey', 'active', 'telegram'),
  ('a1b2c3d4-3333-4a7b-b2e1-9c3f4d5a6e7b', 'Fatma Demir', '+90 555 456 ****', 'Headache', 'Istanbul, Turkey', 'active', 'whatsapp'),
  ('a1b2c3d4-4444-4a7b-b2e1-9c3f4d5a6e7b', 'Ali Yıldırım', '+90 555 567 ****', 'Checkup', 'Izmir, Turkey', 'pending', 'whatsapp'),
  ('a1b2c3d4-5555-4a7b-b2e1-9c3f4d5a6e7b', 'Zeynep Arslan', '+90 555 678 ****', 'Eye exam', 'Istanbul, Turkey', 'active', 'telegram'),
  ('a1b2c3d4-6666-4a7b-b2e1-9c3f4d5a6e7b', 'Hasan Çelik', '+90 555 789 ****', 'Dental', 'Bursa, Turkey', 'cancelled', 'whatsapp');

-- Seed messages for Büşra Zeydan
INSERT INTO public.messages (patient_id, sender_type, text, platform, created_at) VALUES
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'patient', 'Merhaba, sırt ağrısı için randevu almak istiyorum. En yakın müsait gün ne zaman?', 'whatsapp', now() - interval '10 minutes'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'ai', 'Hastanın geçmiş kayıtlarını kontrol ettim. Büşra Zeydan, son 3 ayda 2 kez ortopedi bölümünü ziyaret etmiş. Dr. Öztürk''ün yarın 14:30''da müsait bir slotu var. Randevuyu onaylamak ister misiniz?', null, now() - interval '9 minutes'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'secretary', 'Büşra Hanım, yarın saat 14:30''da Dr. Öztürk ile bir randevunuz uygun görünüyor. Size uyar mı?', null, now() - interval '8 minutes'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'patient', 'Evet, çok teşekkürler! Yarın 14:30 uygun. Yanıma ne getirmem gerekiyor?', 'whatsapp', now() - interval '6 minutes'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'ai', 'Standart ortopedi ziyareti gereksinimleri: Kimlik, SGK kartı ve varsa önceki röntgen sonuçları. Otomatik hatırlatma mesajı gönderilsin mi?', null, now() - interval '5 minutes'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'secretary', 'Kimliğinizi ve SGK kartınızı getirmeniz yeterli olacaktır. Eğer daha önce çektirilmiş röntgen sonuçlarınız varsa onları da getirirseniz iyi olur. 😊', null, now() - interval '4 minutes');

-- Seed messages for Mehmet Kaya
INSERT INTO public.messages (patient_id, sender_type, text, platform, created_at) VALUES
  ('a1b2c3d4-2222-4a7b-b2e1-9c3f4d5a6e7b', 'patient', 'Can I reschedule to Friday?', 'telegram', now() - interval '8 minutes');

-- Seed messages for Fatma Demir
INSERT INTO public.messages (patient_id, sender_type, text, platform, created_at) VALUES
  ('a1b2c3d4-3333-4a7b-b2e1-9c3f4d5a6e7b', 'patient', 'Thanks, see you tomorrow!', 'whatsapp', now() - interval '15 minutes');

-- Seed appointments for today
INSERT INTO public.appointments (patient_id, doctor, type, scheduled_at, status) VALUES
  ('a1b2c3d4-3333-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Öztürk', 'Follow-up', now()::date + interval '9 hours', 'completed'),
  ('a1b2c3d4-5555-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Yılmaz', 'Consultation', now()::date + interval '10 hours 30 minutes', 'completed'),
  ('a1b2c3d4-2222-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Öztürk', 'Check-up', now()::date + interval '11 hours 30 minutes', 'in-progress'),
  ('a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Öztürk', 'Ortho Visit', now()::date + interval '14 hours 30 minutes', 'pending'),
  ('a1b2c3d4-4444-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Yılmaz', 'X-Ray Review', now()::date + interval '15 hours', 'upcoming'),
  ('a1b2c3d4-6666-4a7b-b2e1-9c3f4d5a6e7b', 'Dr. Öztürk', 'Follow-up', now()::date + interval '16 hours 30 minutes', 'upcoming');
