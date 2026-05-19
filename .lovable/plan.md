## Sorun

`supabase/functions/place-outbound-call/index.ts` içinde, her aramaya Clinix tarafından bir `first_message` override gönderiliyor. Manuel arama için varsayılan metin:

> "Merhaba {isim}, Clinix asistanı ile görüşüyorsunuz. Size nasıl yardımcı olabilirim?"

Randevu hatırlatma için:

> "Merhaba {isim}, Clinix kliniğinden arıyorum. ..."

Yani ElevenLabs dashboard'da agent için ayarladığın ilk mesaj kullanılmıyor — Clinix kendi metnini zorluyor. Bu yüzden arama "Clinix asistanı" diye başlıyor.

## Çözüm

`place-outbound-call` içinde first_message override mantığını şu şekilde değiştir:

1. **Varsayılan Clinix greeting'lerini kaldır.** `defaultGreeting` değişkenini sil.
2. **Sadece çağrıyı yapan açıkça `initial_message` gönderirse** `first_message` override eklensin. Aksi halde `conversation_config_override.agent.first_message` payload'a hiç konmasın → ElevenLabs dashboard'daki agent ilk mesajı kullanılır.
3. `language: "tr"` ve `dynamic_variables` (patient_name, call_type, vb.) aynen kalsın — bunlar agent'ın bağlamı için gerekli, ilk mesajı override etmiyor.
4. `check-appointment-reminders` ve `VoiceAgentTab` (test araması) tarafından `initial_message` gönderiliyor mu kontrol et:
   - Hatırlatma cron'u şu an `initial_message` göndermiyor → dashboard mesajı kullanılır. ✓
   - UI test araması da `initial_message` göndermiyorsa → dashboard mesajı kullanılır. ✓

## Sonuç

Bu değişiklikten sonra ElevenLabs dashboard'da agent için tanımladığın "First message" alanı (örn. doktor ismiyle özelleştirdiğin karşılama) her aramada kullanılacak. Clinix artık ilk cümleyi zorlamayacak; sadece arka planda `dynamic_variables` ile hasta adı ve bağlamı gönderecek (agent prompt'unda `{{patient_name}}` gibi placeholder kullanabilirsin).

Onaylarsan uygulayayım.