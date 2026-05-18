# Ercan Hoca Kliniği — Entegrasyon Planı

## Mevcut durum analizi

Sistemin RLS modeli **user_id bazlı tek kiracılı**: her tablo `auth.uid() = user_id` koşuluyla filtreleniyor. Yani bir kullanıcının açtığı hasta/randevu/mesaj sadece ona görünüyor. Admin tüm verileri görebiliyor.

Sen ise şu yapıyı istiyorsun:
- **Dr. Ercan** (yetişkin)
- **Eşi** (çocuk kardiyolojisi)
- **Sekreter** (her ikisini de yönetiyor)
- İki doktor ayrı çalışır gibi görünmeli ama sekreter ortak

Mevcut şema doğrudan bunu desteklemiyor. İki seçenek var, planda **A** önerisini detaylandırıyorum çünkü en az kod değişikliği ile çalışır.

---

## Seçenek A (önerilen): Tek "klinik sahibi" hesap + `doctor` alanı ile ayrım

Klinikte tek bir `user_id` sahibi olur (örn. `ercan-klinik@…`). Sekreter ve diğer doktor bu hesabın kullanıcı oturumlarını paylaşmaz; bunun yerine her birinin kendi hesabı vardır ve **admin/clinic-member** rolü ile aynı veriye erişir. Hastalar, randevular, mesajlar tek `user_id` altında toplanır. `appointments.doctor` ve `patients.doctor` alanları zaten var — "Ercan" / "Eşi" ayrımı bu alanla yapılır; takvim ve listelerde doktor filtresi gösterilir.

**Avantaj:** Sekreter iki doktoru da tek ekranda görür, raporlama doğal, kod değişikliği minimum.
**Dezavantaj:** İki doktorun verilerinin tam izolasyonu yok (gerek de yok çünkü aynı klinik).

### Yapılacaklar

1. **Klinik üyelik altyapısı** (yeni tablo `clinic_members`)
   - `owner_user_id` (klinik sahibi) + `member_user_id` + `role` (`doctor` / `secretary`)
   - RLS politikalarına `OR is_clinic_member(auth.uid(), user_id)` koşulu eklenir (security definer fonksiyon).
   - `patients`, `appointments`, `messages`, `patient_reminders`, `learning_logs`, `voice_calls`, `clinical_templates`, `clinic_schedule` tablolarının SELECT/INSERT/UPDATE/DELETE politikalarına bu OR eklenir.
   - INSERT politikalarında `user_id = klinik_sahibi_user_id` olarak yazılmasını sağlamak için trigger: üye bir kayıt eklediğinde `user_id` otomatik klinik sahibine çevrilir.

2. **Yeni hesapların açılması**
   - Önce klinik sahibi e-postasıyla kayıt → sen admin olarak `doctor` rolü ver.
   - Sekreter ve eş doktor kayıt → admin paneline düşer → `clinic_members` tablosuna `ercan-klinik` sahibi altında eklenir.
   - `useRole` ve `ProtectedRoute` üye kontrolü için `useClinic()` benzeri bir hook alır.

3. **Klinik bilgileri**
   - `voice_agent_settings.clinic_name = "Ercan Hoca Kliniği"`, `doctor_name = "Dr. Ercan …"`, ikinci doktor için ek alan ya da settings'te `secondary_doctor_name`.
   - `clinic_schedule` Ercan ve eşi için ayrı satır gerekiyorsa şemaya `doctor` alanı eklenir (şu an user başına tek satır).
   - `widget_settings` klinik için ayarlanır (logo, renk, karşılama).
   - `quick_replies` global olduğu için Ercan hoca için ön tanımlı 8-10 cevap eklenir.

4. **WhatsApp + n8n bağlantısı**
   - n8n'de mevcut "Clinix WhatsApp" workflow'unu klone et: yeni WhatsApp Business numarası → `handle_omnichannel_message` RPC'sine `p_clinic_user_id = ercan-klinik-uuid` parametresi ile bağla (RPC bu parametreyi zaten destekliyor).
   - n8n credential: Ercan klinikinin Meta WABA token'ı.
   - Sekreterin telefonuna OneSignal push subscription kaydı için tarayıcıdan ilk girişte izin → otomatik kaydolur.

5. **MedicaSimple veri göçü**
   MedicaSimple'ın dışa aktarma seçeneği var mı önce onu kontrol etmemiz lazım. Üç olası senaryo:
   - **a) CSV/Excel export var:** Hasta listesi (ad, telefon, doğum, notlar) ve randevu listesi (tarih, doktor, tip) CSV olarak alınır → biz `/scan` modülüne benzer bir **Bulk Import** sayfası açarız (yeni `src/pages/Import.tsx`), CSV yükleme + alan eşleme + tek seferde `patients` + `appointments` insert.
   - **b) API var:** Edge function ile çekip aynı insert mantığıyla aktarırız.
   - **c) Hiçbir export yoksa:** MedicaSimple ekranlarının ekran görüntüleri zaten **Görselden Kayıt** modülünden geçirilebilir; ama 100+ hasta için yorucu. Bu durumda sekreterle bir gün ayırıp manuel + Görselden Kayıt karması yaparız.

   **Senin yapman gereken:** MedicaSimple'a girip "Dışa Aktar / Export / Yedek Al" menülerine bak ve hangisinin mümkün olduğunu söyle — planı buna göre netleştirelim.

6. **Doğrulama & test**
   - Test hastası ekle (Ercan), test randevu (Eşi), sekreter hesabıyla giriş → her ikisini de görebildiğini doğrula.
   - WhatsApp test mesajı → patient otomatik oluşmalı, doğru `user_id` ile.
   - Push bildirim test (randevu hatırlatıcı).
   - Realtime: iki tarayıcıda aynı anda sekreter + doktor girişi, mesaj geldiğinde ikisinde de düşmeli.

---

## Teknik detaylar (geliştirici için)

**Yeni migration özeti:**
```text
- create table clinic_members (id, owner_user_id, member_user_id, role, created_at)
- create function is_clinic_member(_user uuid, _owner uuid) returns boolean security definer
- her tabloda RLS USING ((auth.uid() = user_id) OR is_clinic_member(auth.uid(), user_id) OR has_role('admin'))
- trigger before insert: NEW.user_id := coalesce(owner of auth.uid(), auth.uid())
```

**Yeni sayfalar/komponentler:**
- `src/pages/Import.tsx` — CSV upload + mapping wizard (papaparse)
- `src/components/team/ClinicMembersTab.tsx` — Team Management'a ek: klinik üyesi atama
- `src/hooks/useClinic.ts` — aktif klinik sahibi user_id'yi döner

**Etkilenen mevcut dosyalar:**
- `src/hooks/useRole.ts` — `clinicOwnerId`, `isClinicSecretary` eklenir
- `src/components/appointments/NewAppointmentDialog.tsx` — doktor seçici (Ercan / Eşi) varsayılan olarak gelir
- `src/components/dashboard/SidebarNav.tsx` — gerekirse doktor filtresi
- `supabase/functions/widget-message/index.ts` — clinic_user_id parametre yönetimi (zaten kısmen var)

---

## Sıralama (uygulama günü için checklist)

1. ☐ MedicaSimple export imkânını kontrol et, bana söyle
2. ☐ Klinik sahibi e-posta + sekreter e-posta + eş doktor e-posta hazırla
3. ☐ Migration: `clinic_members` + RLS güncellemeleri (onayını alıp uygularım)
4. ☐ 3 hesabı kaydet, admin panelinden onayla ve klinik üyesi olarak ekle
5. ☐ Klinik ayarları: çalışma saatleri, klinik adı, widget, voice agent persona
6. ☐ WhatsApp numarası + n8n workflow bağlantısı
7. ☐ Veri göçü (yöntem seçildikten sonra)
8. ☐ Sekreter ve doktorlarla 30 dk eğitim turu

---

Planı onaylarsan **3. adımdan** başlayıp migration'ı yazarım; MedicaSimple cevabını verince **7. adımı** detaylandırırım.