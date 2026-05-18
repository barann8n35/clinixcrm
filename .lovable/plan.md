# ElevenLabs Agent'a Tam Kontrol

## Sorun

Şu an `voice-twiml-handler` edge function:
1. Önce Twilio'nun robotik `<Say>` sesiyle Clinix'teki `greeting_message`'ı okutuyor
2. Sonra ElevenLabs agent'a `<Stream>` ile bağlanırken `voice_id`, `language`, `first_message`, `prompt` parametrelerini **override** olarak gönderiyor

Sonuç: ElevenLabs dashboard'unda yazdığın prompt/ses/karşılama devre dışı kalıyor, Clinix'tekiler kullanılıyor. Demoda da bu yüzden "Clinix'in default karşılaması okundu ama agent'ın kendi promptu çalışmadı" durumu oluştu.

## Çözüm

Sen her doktor için ElevenLabs dashboard'undan ayrı agent (veya prompt) yöneteceksin. Clinix'in bu işe karışmaması gerekiyor.

### `supabase/functions/voice-twiml-handler/index.ts` — Sadeleştir

**Kaldırılacak:**
- `voice_agent_settings` tablosundan okuma (greeting, voice_id, language, persona, clinic_name, doctor_name)
- `<Say>` ile ön karşılama (ElevenLabs agent'ın `first_message`'ı zaten karşılayacak)
- `<Stream>` içindeki `voice_id`, `language`, `first_message`, `prompt` Parameter'leri

**Kalacak / korunacak:**
- `ELEVENLABS_AGENT_ID` env kontrolü
- `call_id` ve `patient_name` Parameter'leri (agent loglarda hangi hasta olduğunu görebilsin — opsiyonel ama faydalı)
- `<Connect><Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...">` ana yapısı
- Hata durumu için fallback TwiML

### Yeni minimal TwiML şeması

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id={AGENT_ID}">
      <Parameter name="call_id" value="{call_id}" />
      <Parameter name="patient_name" value="{patient_name}" />
    </Stream>
  </Connect>
</Response>
```

### Clinix UI tarafı — DOKUNULMAYACAK

`/voice-agent` sayfası ve `VoiceAgentTab.tsx` aynen kalsın. İstersen ileride tekrar Clinix'ten yönetmek istersen UI hazır. Sadece backend artık o ayarları okumayacak. Sayfayı tamamen gizlemek istersen ayrı bir adım açarız.

## Doğrulama (deploy sonrası)

1. `/voice-agent` → Test Araması → `+905537725206` ara
2. Agent senin ElevenLabs dashboard'unda yazdığın `first_message` ile karşılıyor mu?
3. Konuşmaya devam ettiğinde dashboard'daki prompt'u kullanıyor mu?
4. ElevenLabs dashboard → Conversations sekmesinde transcript görünüyor mu?

Onaylarsan tek dosya değişikliği yapıp deploy edeceğim.
