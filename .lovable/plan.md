# Sistem Denetim Raporu — Eksikler ve Öneriler

Mevcut sistemi (frontend, edge functions, veritabanı, RLS, entegrasyonlar) inceledim. Aşağıda öncelik sırasına göre tespit ettiğim eksikleri ve önerdiğim aksiyonları gruplayarak listeledim.

---

## 1. KRİTİK — Hemen Çözülmesi Önerilen

### A. Instagram Webhook için secret'lar eksik
`instagram-webhook` edge function deploy edildi ama 3 secret henüz eklenmedi:
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `INSTAGRAM_PAGE_ACCESS_TOKEN`

Sen bunları Meta Developer panelinden alıp paylaşana kadar Instagram DM'leri sisteme akmaz.

### B. Telefonsuz hasta kayıtları (11 / 28)
Veritabanında **11 hastanın telefonu boş**. Bu kayıtlar:
- Randevu hatırlatma (WhatsApp/SMS) alamaz,
- Sesli AI dış arama yapamaz,
- Kampanya audience'larından otomatik düşer.

**Öneri:** `Patients` ekranında "Telefonu Eksik" filtresi + uyarı rozeti ekle. Yeni hasta formunda telefonu zorunlu (NOT NULL) yapma seçeneği sun.

### C. Güvenlik taraması yapılmadı
Son aylarda RLS policy'leri ve `auth.uid()` default'ları değişti. **Tam güvenlik taraması** çalıştırıp, kalan açık varsa kapatmamız gerekiyor (özellikle yeni `instagram-webhook` ve mevcut `widget-message` public endpoint'leri için).

---

## 2. YÜKSEK — Fonksiyonel Boşluklar

### D. Onboarding akışı eksik
Yeni kayıt → "Pending Approval" ekranında bekliyor. Admin onayladıktan sonra kullanıcıya:
- E-posta bildirimi gitmiyor,
- İlk açılışta tur/wizard tetiklenmiyor (`OnboardingWizard.tsx` var ama bağlı değil gibi).

### E. Şifre sıfırlama akışı
`Auth.tsx`'de "Şifremi unuttum" linki var mı kontrol edilmeli. Yoksa eklenmeli (Supabase `resetPasswordForEmail`).

### F. Hata sınırı (Error Boundary) yok
Daha önce "ekran beyaz kaldı" sorunu yaşadık. Global bir `<ErrorBoundary>` (ör. `react-error-boundary`) ile beyaz ekran yerine kullanıcıya friendly fallback + "Yeniden Yükle" butonu gösterilmeli.

### G. Audit log / Aktivite kaydı yok
Kim ne zaman hangi hastayı düzenledi, hangi randevuyu iptal etti — kayıt yok. KVKK ve takım yönetimi için kritik. Basit bir `activity_logs` tablosu + tetikleyiciler önerilir.

---

## 3. ORTA — UX / İçerik İyileştirmeleri

### H. Boş durumlar (Empty states)
`Pipeline`, `Campaigns`, `Inventory`, `KnowledgeBase` sayfaları ilk girişte boş. Her birine illüstrasyonlu "Henüz yok — şununla başla" CTA'sı ekle.

### I. Mobil push test akışı
`use-push-notifications` ve OneSignal kurulu ama Settings ekranında "Test Bildirim Gönder" butonu var mı belirsiz. Kullanıcının kurulumun çalıştığını doğrulayabilmesi için eklenmeli.

### J. Pricing → Checkout bağlantısı
`Pricing.tsx` sayfası var ama Stripe/Paddle bağlı değil. "Premium'a Geç" butonu şu an sadece görsel — ya Stripe entegre edilmeli ya da "WhatsApp ile iletişime geç" akışına bağlanmalı.

### K. i18n eksik anahtarlar
SidebarNav'a son eklenen "Güvenlik & KVKK" ve "Sesli AI Asistan" gibi öğeler `labelKey` yerine düz Türkçe metin içeriyor. EN moduna geçince çevrilmiyor.

---

## 4. DÜŞÜK — Teknik Borç

### L. `useRole` cache yok
Her sayfa değişiminde rol sorgusu yeniden yapılıyor. TanStack Query ile cache'lenmeli (5 dk staleTime).

### M. Edge function'larda yapılandırılmış log yok
Hata ayıklamak için JSON formatında log + correlation ID önerilir.

### N. `widget-message` rate limit in-memory
Edge function instance restart olunca sıfırlanıyor. Kalıcı rate limit için Supabase tablosu veya Upstash Redis önerilir (şimdilik bekleyebilir).

---

## Tavsiye edilen sıra

```text
1. Güvenlik taraması çalıştır              → 1 dk
2. ErrorBoundary + Pricing CTA fix         → küçük
3. i18n eksik label'lar                    → küçük
4. Şifre sıfırlama akışı                   → orta
5. Audit log altyapısı                     → orta-büyük
6. Onboarding e-posta + wizard tetikleyici → orta
7. Stripe entegrasyonu (eğer ödeme almak istiyorsan) → büyük
```

---

## Sıradaki adım

Hangilerini bu turda yapmamı istersin? Önerim: **1, 2, 3** maddelerini tek seferde halledelim (hızlı ve riski düşük), sonra kalanları ayrı turlarda ele alalım.

Onaylarsan plan modundan çıkıp uygulamaya geçeyim. Farklı bir öncelik istersen söyle, planı güncelleyeyim.
