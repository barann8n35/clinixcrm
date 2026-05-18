## Plan

Arama kaydı Clinix tarafında başarıyla oluşuyor (`conversation_id` ve Twilio SID geliyor), yani sorun aramayı başlatma değil; konuşmanın başlatılma/veri aktarım aşamasında stabil olmaması. Bunu Clinix tarafında daha deterministik hale getireceğim.

## Yapılacaklar

1. **Outbound çağrı payload’unu güçlendirme**
   - `place-outbound-call` içinde ElevenLabs `outbound-call` isteğine `conversation_initiation_client_data` eklenecek.
   - Her çağrı için sabit, kısa ve Türkçe bir `first_message` override gönderilecek.
   - `language: "tr"` açıkça gönderilecek.
   - Gerekirse `initial_message` varsa onu ilk mesaj olarak kullanacak, yoksa güvenli varsayılan karşılama dönecek.

2. **Telefon görüşmesi davranışını daha stabil yapma**
   - `call_recording_enabled: true` eklenecek; böylece ElevenLabs/Twilio tarafında sessiz kalan çağrıları sonradan incelemek kolaylaşacak.
   - `telephony_call_config.ringing_timeout_secs` net tanımlanacak.
   - ElevenLabs cevabındaki tüm önemli alanlar loglanacak, fakat API key/secret loglanmayacak.

3. **Hasta/randevu bağlamı gönderme**
   - Mümkün olduğunda `dynamic_variables` içine hasta adı, çağrı tipi, randevu ID gibi güvenli bağlam bilgileri eklenecek.
   - Böylece agent ilk cümlede boşta kalmayacak ve konuşmayı başlatmak için bekleme ihtimali azalacak.

4. **UI test aramasını daha kontrollü hale getirme**
   - Test aramasından `initial_message` gönderilecek: kısa, net Türkçe karşılama.
   - Başarılı toast aynı kalacak; hata mesajları daha açıklayıcı gösterilecek.

5. **Doğrulama**
   - Edge Function deploy/test sonrası son kayıtların `initiated + conversation_id` olarak oluştuğu kontrol edilecek.
   - Sessiz kalma tekrar ederse, artık `conversation_id` + kayıt açık olduğundan ElevenLabs Conversation History üzerinde hangi aşamanın boş kaldığı net görülebilecek.

## Teknik not

ElevenLabs native Twilio API’si `conversation_initiation_client_data` destekliyor. Bu, dashboard ayarlarını tamamen değiştirmeden sadece bu çağrı için ilk mesaj/dil/dinamik değişken göndermemizi sağlar. Bu değişiklik aramanın “bazen konuşmuyor” davranışını azaltmak için en doğru Clinix tarafı müdahaledir.