## Sesli Asistan: Mükerrer Kontrol + Yeniden Planlama + Gelen Arama

Üç yeni yetenek ekliyoruz. Tümü ElevenLabs Conversational AI'ın **Custom Tools** olarak çağıracağı edge function'lar ve Twilio inbound numarası entegrasyonu.

---

### 1) Mükerrer randevu engeli (`voice-book-appointment` güncellemesi)

`voice-book-appointment/index.ts` içinde, randevu insert etmeden önce iki kontrol:

**a) Aynı hasta için yakın tarihli aktif randevu var mı?**
- Aynı `patient_id` için `status IN ('upcoming','rescheduled','pending')` ve tarih ±2 saat içindeyse → yeni eklemeden mevcut randevuyu döndür:
```json
{ "success": false, "duplicate": true, "appointment_id": "...", "scheduled_at": "DD.MM.YYYY HH:mm",
  "message": "Bu hastanın zaten yakın bir randevusu var." }
```
- Asistan bu mesajı sesli olarak iletir ("zaten X tarihli randevunuz var, değiştirmek ister misiniz?").

**b) Slot dolu mu?**
- DB'de zaten `check_appointment_slot_conflict` trigger var (aynı doktor + aynı saat). Hata kodunu yakalayıp asistana net bir mesajla döndür:
```json
{ "success": false, "slot_taken": true, "message": "Bu saat dolu, başka bir saat önerin." }
```

---

### 2) Yeni edge function: `voice-reschedule-appointment`

Dosya: `supabase/functions/voice-reschedule-appointment/index.ts` (verify_jwt = false)

**Input (ElevenLabs tool params):**
- `phone` (zorunlu — hastayı bulmak için)
- `new_date` ("DD.MM.YYYY" veya "YYYY-MM-DD")
- `new_time` ("HH:mm")
- `appointment_id` (opsiyonel — biliniyorsa direkt)

**Davranış:**
1. `phone` ile hastayı bul (normalizePhone). Bulunamazsa `{ success: false, error: "Hasta bulunamadı" }`.
2. `appointment_id` yoksa en yakın **gelecekteki** aktif randevuyu seç (`scheduled_at >= now()`, status aktif, `ORDER BY scheduled_at ASC LIMIT 1`).
3. Yeni `scheduled_at` hesapla, slot çakışmasını kontrol et (trigger zaten engelliyor — hatayı yakala).
4. `appointments.update({ scheduled_at, status: 'rescheduled' })`.
5. Aynı işlemde `patients.update({ status: 'rescheduled', appointment_date: iso })`.
6. `messages` tablosuna sistem notu ekle ("Asistan tarafından yeniden planlandı: …").
7. Dönüş:
```json
{ "success": true, "appointment_id": "...", "old_scheduled_at": "...",
  "new_scheduled_at": "DD.MM.YYYY HH:mm", "message": "Randevu güncellendi." }
```

`supabase/config.toml`'a ekle:
```toml
[functions.voice-reschedule-appointment]
verify_jwt = false
```

---

### 3) Gelen arama (Inbound) desteği

Şu anda yalnızca **outbound** (`place-outbound-call` → ElevenLabs `outbound-call`) çalışıyor. Inbound için akış:

**a) ElevenLabs Phone Number eşleştirmesi**
- Twilio numarası ElevenLabs Console'da agent'a inbound olarak bağlanır (ElevenLabs Console → Phone numbers → Inbound agent = sizin agent).
- Bu yapıldığında Twilio'ya gelen aramayı ElevenLabs **otomatik** karşılar; Lovable tarafında ek kod gerekmez — agent aynı, tools aynı (book + reschedule).
- Bunu sen ElevenLabs Console'da yapacaksın; ben kod değişikliği gerektirmediği için sadece talimat veriyorum.

**b) Gelen aramaları CRM'e loglamak için: `voice-inbound-webhook`**
Opsiyonel ama önerilir. ElevenLabs **Post-call webhook** olarak çağıracağı bir function:

Dosya: `supabase/functions/voice-inbound-webhook/index.ts` (verify_jwt = false)
- ElevenLabs `conversation_initiation_metadata` / `post_call_transcription` payload'ını alır.
- `voice_calls` tablosuna `direction='inbound'`, `from_number`, `to_number`, `conversation_id`, `transcript`, `summary`, `status='completed'` insert eder.
- Telefon numarasıyla `patients` eşleştirip `patient_id` doldurur (yoksa yeni hasta oluşturmaz — sadece log).

**c) Twilio numarası alternatif yöntem (eğer ElevenLabs inbound mapping sorunlu olursa)**
Twilio Voice Webhook → mevcut `voice-twiml-handler` (zaten var) → ElevenLabs WebSocket'ine `<Connect><Stream>` ile bağlama. Şimdilik (a) yeterli olacaktır; (c)'yi ancak gerekirse devreye alırız.

---

### Teknik detaylar (geliştirici notları)

- **Mükerrer pencere:** ±2 saat varsayılan; aynı gün aynı doktora ikinci slot mantıksız.
- **Status değerleri:** `upcoming`, `rescheduled`, `pending`, `cancelled`, `arrived`. Aktif = (cancelled/arrived hariç).
- **Trigger reuse:** `check_appointment_slot_conflict` trigger'ı update'te de çalışır → reschedule sırasında ekstra kontrol gerekmez.
- **`messages` insert:** `user_id` = clinicUserId, `sender_type='system'`, `platform=null`.
- **ElevenLabs tool tanımı:** Console'da iki yeni custom tool eklemen gerekecek:
  - `reschedule_appointment` → POST `https://czqhorgsutnadznkibkb.functions.supabase.co/voice-reschedule-appointment`
  - (mevcut) `book_appointment` zaten tanımlı.
- **Inbound URL:** Webhook için `https://czqhorgsutnadznkibkb.functions.supabase.co/voice-inbound-webhook` — ElevenLabs Console → Agent → Post-call webhook.

---

### Teslimat checklist

1. `voice-book-appointment` güncelle (mükerrer + slot çakışması yanıtları).
2. `voice-reschedule-appointment` oluştur + `config.toml` güncelle.
3. `voice-inbound-webhook` oluştur + `config.toml` güncelle.
4. URL'leri ve ElevenLabs Console adımlarını sana ileteceğim.