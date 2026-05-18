# Çoklu Klinik Sekreter Desteği — Plan

## Senin sorularının kısa cevapları

**"Bilgiler karışır mı?"** → Hayır, karışmaz. RLS her satırı `user_id`'ye göre filtreler. Ercan'ın hastası `user_id = ercan_uuid`, eşin hastası `user_id = es_uuid`. Sekreter ikisinin de üyesi olduğu için ikisini de görür ama Ercan giriş yaptığında eşin hastalarını **göremez** (üyeliği yok). Tam izolasyon.

**"Benim ne yapmam gerekiyor?"** → Aşağıda 4 adım.

---

## Mevcut sorun (kritik)

Şu anki trigger `set_clinic_owner_on_insert()` şöyle çalışıyor: sekreter bir hasta eklediğinde `clinic_owner_for(auth.uid())` çağrılıyor, bu da `LIMIT 1` ile **sadece ilk bulduğu kliniği** atıyor. Yani sekreter iki doktora atanırsa, eklediği her hasta hep aynı doktora yazılır → diğer doktor görmez. Bunu çözmemiz lazım.

---

## Çözüm: "Aktif Klinik" seçici

Sekreter giriş yaptığında üst barda küçük bir dropdown olacak: **"Aktif Klinik: Dr. Ercan ▼"**. Seçimi `localStorage` + React Context'te tutarız. Yeni hasta/randevu/mesaj eklediğinde:

- Trigger artık `auth.uid()`'nin tek kliniği varsa otomatik atar (eskisi gibi).
- Birden fazla kliniği varsa, **frontend `user_id`'yi manuel set eder** (aktif klinik seçimine göre). Trigger bu durumda dokunmaz.
- Doktorların (Ercan, eş) kendi girişlerinde seçici görünmez — kendileri zaten owner.

### Trigger güncellemesi
```sql
-- Sekreter tek kliniğe atanmışsa otomatik ata, çoklu ise frontend'in verdiği user_id'ye dokunma
CREATE OR REPLACE FUNCTION set_clinic_owner_on_insert() ...
  -- Eğer NEW.user_id zaten geçerli bir owner ise (frontend explicit verdi) dokunma
  -- Yoksa clinic_owner_for() ile tek üyelik varsa onu kullan
```

---

## Randevuda doktor rengi

`CalendarPage.tsx` (FullCalendar) ve `Appointments.tsx` listesinde her randevu `appointment.doctor` alanını taşıyor. Doktor adı bazlı renk haritası ekleyeceğiz:

- **Dr. Ercan** → mavi (`hsl(210 90% 50%)`)
- **Dr. (eş)** → mor (`hsl(280 70% 55%)`)
- Diğer → mevcut tip-bazlı renk

`Settings → Profile`'da doktorun kendi rengini seçebileceği bir `doctor_color` alanı `voice_agent_settings`'a (veya yeni `doctor_profiles` tablosuna) eklenebilir. İlk versiyonda **sabit harita** ile gidelim, sonra dinamik yaparız.

---

## Rol etiketi sadeleştirme

`ClinicMembersPanel.tsx` dropdown'u:
- ~~Sekreter / Doktor (Eş) / Asistan~~
- ✅ **Sekreter / Doktor / Asistan**

Veritabanı değeri (`secretary` / `doctor` / `asistan`) değişmiyor, sadece UI label.

---

## Senin yapacakların (sırayla)

1. **3 hesap aç** `/auth` sayfasından:
   - `ercan@klinik.com` (Dr. Ercan)
   - `es@klinik.com` (eş doktor)
   - `sekreter@klinik.com` (sekreter)

2. **Admin panelinde** (Takım Yönetimi) her birinin rolünü ata:
   - Ercan → **Doktor**
   - Eş → **Doktor**
   - Sekreter → **Asistan** veya **Sekreter** (rol tanımına göre)

3. **Klinik Üyelikleri** panelinde 2 eşleştirme ekle:
   - Sahip: Ercan → Üye: Sekreter (rol: Sekreter)
   - Sahip: Eş → Üye: Sekreter (rol: Sekreter)

4. Sekreter giriş yapınca üst barda klinik seçici göreceği için, hasta/randevu eklerken hangi doktora ait olduğunu seçer.

---

## Uygulama planı (kod tarafında)

### Yeni migration
- `set_clinic_owner_on_insert()` fonksiyonunu güncelle: frontend explicit `user_id` verdiyse dokunma; tek üyelik varsa otomatik ata; çoklu üyelikte `NEW.user_id` zaten doğru olmalı.

### Yeni dosyalar
- `src/contexts/ActiveClinicContext.tsx` — sekreterin aktif klinik seçimini tutar, `clinic_members`'tan kullanıcının üyeliklerini çeker.
- `src/components/dashboard/ActiveClinicSwitcher.tsx` — üst bara takılan dropdown, sadece üyeliği ≥2 olan kullanıcılarda görünür.

### Düzenlenecek dosyalar
- `src/components/team/ClinicMembersPanel.tsx` — "Doktor (Eş)" → "Doktor".
- `src/components/layouts/DashboardLayout.tsx` — `ActiveClinicSwitcher` mount.
- `src/components/appointments/NewAppointmentDialog.tsx`, `src/components/patients/PatientDetailModal.tsx` (yeni hasta), `src/pages/Patients.tsx` (insert noktaları) — insert yaparken aktif klinik `user_id`'sini ekle.
- `src/pages/CalendarPage.tsx`, `src/pages/Appointments.tsx`, `src/components/dashboard/MiniSchedule.tsx` — doktor bazlı renk haritası.
- `src/index.css` — `--doctor-ercan` / `--doctor-secondary` HSL token'ları.

### Test
- Sekreter girişi → aktif klinik "Ercan" seç → hasta ekle → Ercan girişinde görünmeli, eş girişinde görünmemeli.
- Aktif klinik "Eş" seç → randevu ekle → takvimde mor renkte, eş girişinde görünmeli, Ercan görmemeli.
- Admin (sen) her ikisini de görmelisin.

---

Onaylarsan migration + kod değişikliklerini sırayla yapacağım.
