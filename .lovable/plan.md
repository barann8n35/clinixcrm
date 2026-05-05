# Premium Klinik Takvimi — Google Calendar bağımsız

Mevcut `CalendarPage` (FullCalendar) çalışıyor ama "premium" hissi vermiyor: tipografi standart, slot/randevu tasarımı sade, slot çakışma koruması yok, çalışma saatleri yok. Bunu uçtan uca yenileyip Google Calendar'a hiç ihtiyaç bırakmıyoruz.

## 1. Veri katmanı (Supabase)

**Yeni tablo: `clinic_schedule`** (her klinik için bir satır)
- `user_id` uuid, `working_hours` jsonb (örn. `{"mon":{"start":"09:00","end":"18:00"},"sun":null}`)
- `slot_duration_minutes` int default 30
- `buffer_minutes` int default 0
- RLS: `auth.uid() = user_id` + admin

**`appointments` üzerine slot koruma trigger'ı**
- Aynı doktor + aynı `scheduled_at` (cancelled hariç) iki kez yazılırsa → `RAISE EXCEPTION 'Slot dolu'`
- Çalışma saatleri dışındaysa → uyarı (soft, sadece istemcide kontrol)

**Yeni RPC: `get_available_slots(p_date, p_doctor)`**
- O gün için `clinic_schedule` × dolu randevuları çıkararak müsait saat listesini döner
- Frontend slot picker bunu kullanır → dolu saatler gri/disabled

## 2. Takvim sayfasını yeniden tasarla (`CalendarPage`)

**Görsel kimlik (premium)**
- Tipografi: Plus Jakarta Sans (header), Inter (body) — `clinix-calendar` CSS sınıfında font-feature-settings: "ss01","cv11" (numerik tabular-nums)
- Header çubuğu: Today/Prev/Next butonları rounded-2xl, ikon-led; "Bugün" pill rozet
- View switcher: segmented control (Ay / Hafta / Gün / Ajanda) — animate-li sliding indicator (framer-motion)
- Saat sütunu: tabular-nums, açık gri ince çizgiler; **şimdiki an çizgisi** kırmızı + nabız animasyonu
- Slot yüksekliği daha rahat (60px / saat), 30dk bölmeleri kesik çizgi
- Hafta görünümünde günlerin üst kısmında: gün adı + tarih + o günkü randevu sayısı badge'i; **bugün** dairesel highlight
- Boş slota hover: yumuşak `bg-primary/5` + "+ Randevu ekle" tooltip
- Randevu kartı: sol kenar tip rengi, ince gölge, hover'da 1.02 scale, status için sağ üstte küçük dot

**Etkileşim**
- Drag & drop: randevuyu yeni slota sürükle → otomatik UPDATE + çakışma kontrolü trigger'dan dönerse toast
- Resize: randevu süresini sürükleyerek uzat (eventResize → `duration` alanı eklenir)
- Boş slota tıkla → mevcut `QuickAppointmentDialog` (zaten var)
- Randevuya tıkla → mevcut detay dialog (mevcut)
- Klavye: `t` = bugün, `m/w/d` = view switch, `←/→` = prev/next

**Yeni: Ajanda (Liste) görünümü**
- Sol sidebar mini ay takvimi, sağda günlere göre gruplu randevu listesi (Notion/Linear stili)
- Her grup başlığı sticky, içinde saat + hasta adı + tip rozeti
- Mobilde varsayılan görünüm bu

**Yeni: Mini sidebar (sağ panel, opsiyonel)**
- Bugün özeti: toplam, geldi, kalan
- Yaklaşan 3 randevu kartı
- Doktor filtresi (multi-select)
- Tip filtresi (Ön Muayene / Muayene / Kontrol / Operasyon)

## 3. Slot picker (NewAppointmentDialog & QuickAppointmentDialog)

- Sabit `timeSlots` dizisi yerine tarih seçildiğinde `get_available_slots` RPC
- Dolu slotlar disabled + üzerinde küçük "Dolu" rozeti
- Doktora göre filtre

## 4. Çalışma saatleri ekranı (Settings → yeni "Çalışma Saatleri" sekmesi)

- Haftanın günleri için açık/kapalı switch + başlangıç/bitiş TimePicker
- Slot süresi: 15/30/45/60 dk segmented
- Tampon süre: 0/5/10/15 dk
- "Tatil günleri" datepicker (multi-select) — bu günler tamamen bloklanır (opsiyonel v2)

## 5. n8n tarafı

- Google Calendar node'unu silebilirsin
- n8n'in randevu okuma/yazması gerekiyorsa direkt Supabase REST'ten `appointments` tablosuna gider (service_role key zaten n8n'de)
- Çakışma koruması trigger seviyesinde, n8n'den de geçerli

## Stack & detaylar (geliştirici)

- FullCalendar Premium **gerekmez** — `@fullcalendar/interaction` zaten var, drag/drop/resize free pluginlerde
- Yeni view: `listWeek` için `@fullcalendar/list` ekle (free)
- CSS: `src/index.css` içine `clinix-calendar` selector altında özel tipografi + spacing override
- TR locale zaten var
- Realtime subscription mevcut → drag/drop sonrası UI otomatik tazelenir

## Dokunulmayacaklar
- `appointments` şeması (sadece trigger)
- Mevcut dialog form alanları (sadece slot picker davranışı değişir)
- KVKK RLS politikaları

Onaylarsan: 1 migration (clinic_schedule + trigger + RPC), CalendarPage yeniden yazımı, index.css premium stilleri, 2 dialog güncellemesi, Settings'e yeni sekme.
