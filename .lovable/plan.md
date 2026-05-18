## Hedef

ElevenLabs'in native Twilio entegrasyonuna geçmek (sorunsuz çalışıyor — test ettin) + Clinix paneldeki **Otomatik Arama Tetikleyicileri**'ni bu yeni akışla canlı kullanmak.

İki katman net ayrılacak:
- **ElevenLabs dashboard** → ses, prompt, karşılama, dil, persona (her doktora özel agent)
- **Clinix paneli** → "ne zaman / kimi / hangi koşulda arayalım" mantığı (tetikleyiciler)

---

## 1. Secret ekleme

- `ELEVENLABS_PHONE_NUMBER_ID` = `phnum_6501kpwv3tyhft3rp12xqf1ksyth`

(`ELEVENLABS_AGENT_ID` ve `ELEVENLABS_API_KEY` zaten var.)

---

## 2. `place-outbound-call` edge function — yeniden yazım

Twilio Gateway + TwiML akışı tamamen kaldırılacak. Yerine ElevenLabs native outbound:

```
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
Header: xi-api-key: ELEVENLABS_API_KEY
Body: {
  agent_id: ELEVENLABS_AGENT_ID,
  agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
  to_number: <E.164>
}
```

`voice_calls` tablosuna kayıt aynı şekilde devam edecek (queued → initiated). Dönen `conversation_id` ve `callSid` kolonlara yazılır.

`voice-twiml-handler` ve `voice-status-webhook` artık devre dışı — ElevenLabs kendi yönetiyor. Dosyaları silmiyorum, sadece kullanılmıyor olacak (geri dönüş ihtimaline karşı).

---

## 3. Clinix Settings UI — netleştirme

`VoiceAgentTab.tsx` içinde:
- **Klinik adı / Doktor adı / Karşılama / Persona / Ses / Dil** alanları → "ElevenLabs dashboard'dan yönetiliyor" banner'ı ile read-only / gizlenir (her doktor kendi agent'ında düzenliyor).
- **Otomatik Arama Tetikleyicileri bölümü tam aktif kalır** (asıl kontrol noktası):
  - Yeni lead geldiğinde otomatik karşıla
  - Randevu hatırlatma (24sa / 1sa)
  - Cevapsız mesaj sonrası ara (+ eşik dk)
  - 7/24 açık / arama saat penceresi
  - Günlük arama limiti
- **Test Araması** bölümü kalır, yeni `place-outbound-call` ile çalışır.

---

## 4. Tetikleyici motoru — gerçek çalışma

Şu an tetikleyici switch'leri DB'de duruyor ama bağlı bir cron yok. Aktive edeceğiz:

**a) Randevu hatırlatma:** Mevcut `check-appointment-reminders` edge function'ı `place-outbound-call`'u çağıracak şekilde güncellenecek (sadece `auto_call_appointment_reminders=true` olan kullanıcılar için, `always_on` veya `call_window` saatleri içinde, `daily_call_limit` aşılmamışsa).

**b) Yeni lead karşılama:** `patients` tablosuna INSERT olduğunda devreye giren bir DB trigger + edge function. `auto_call_new_leads=true` ise, hasta telefonu varsa, ~1 dk sonra arama tetiklenir.

**c) Cevapsız mesaj:** Var olan reminder cron'una (`check-reminders`) bir kontrol eklenecek — son `patient` mesajından beri `unanswered_threshold_minutes` geçmiş ve cevap yoksa arama tetiklenir.

**d) Günlük limit kontrolü:** `place-outbound-call` içine bir guard: bugün için `voice_calls` count'u `daily_call_limit`'i aşıyorsa reddet.

**e) Saat penceresi:** `always_on=false` ise mevcut saat `[call_window_start, call_window_end]` aralığında değilse reddet.

---

## 5. Doğrulama

1. Test Araması → `+905537725206` → ElevenLabs agent'ın dashboard ayarlarıyla konuşur ✅
2. Tetikleyicileri tek tek aç/kapat → her biri için 1 simülasyon (test randevusu, test lead, vs.)
3. Günlük limit ve saat penceresi guard'larının çalıştığını doğrula
4. `voice_calls` tablosunda `conversation_id` doluyor mu

---

## Soru: Tetikleyicileri hangi sırada aktive edelim?

Hepsini birden mi, yoksa önce sadece **Test Araması + Randevu hatırlatma** çalışsın, diğerleri (yeni lead, cevapsız mesaj) ikinci adımda mı? İkinci yaklaşım daha güvenli — yanlışlıkla toplu arama yapma riskini ortadan kaldırır.
