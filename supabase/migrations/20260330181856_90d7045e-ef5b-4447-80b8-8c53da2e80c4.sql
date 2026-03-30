CREATE TABLE public.quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read quick_replies" ON public.quick_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert quick_replies" ON public.quick_replies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update quick_replies" ON public.quick_replies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete quick_replies" ON public.quick_replies FOR DELETE TO authenticated USING (true);

INSERT INTO public.quick_replies (title, content) VALUES
  ('📍 Klinik Konum Bilgisi', 'Kliniğimizin adresi: [Adres bilgisi]. Google Maps linki: [link]. Otopark mevcuttur.'),
  ('🍽️ Açlık Uyarısı', 'Lütfen işlem öncesi en az 8 saat boyunca bir şey yememeniz gerekmektedir. Su içebilirsiniz.'),
  ('✅ Randevu Teyit', 'Sayın hastamız, [tarih] tarihindeki randevunuzu teyit eder misiniz? Lütfen "Evet" veya "Hayır" yazarak bildiriniz.'),
  ('💰 Fiyat Bilgisi', 'İşlem ücretlerimiz muayene sonrası belirlenmektedir. Detaylı bilgi için kliniğimizi arayabilirsiniz.'),
  ('📋 Gerekli Belgeler', 'Lütfen randevunuza gelirken kimliğinizi ve varsa önceki tetkik sonuçlarınızı getirmeyi unutmayınız.');