
Kullanıcı stratejik bir karar soruyor: lip-sync (dudak senkronu) + ses klonlama özelliğini standart pakete mi koymalı yoksa ekstra premium özellik olarak mı sunmalı?

Bu bir kod değişikliği değil, ürün/iş modeli sorusu. Kısa ve net bir öneri sun, sonra teknik açıdan iki yolu da göster.

## Önerim: Ekstra Üst Katman (Premium+) Olarak Sun

### Neden ekstra olmalı?

**1. Maliyet farkı çok büyük**
- Mevcut TTS dublaj (ElevenLabs `eleven_multilingual_v2`): ~$0.30/dakika video
- Ses klonlama + lip-sync (ElevenLabs Voice Clone + HeyGen/Sync.so/D-ID): ~$2-4/dakika video
- 10x maliyet farkı var. Standart pakete koyarsan ya fiyatı 10x artırırsın ya zarar edersin.

**2. İşlem süresi farkı**
- TTS dublaj: 1-2 dakika
- Lip-sync: 5-15 dakika
- Kullanıcı deneyimi açısından farklı bir kategori — ayrı UI/beklenti yönetimi gerekir.

**3. Pazarlama avantajı**
- "Premium" (mevcut) → sağlık turizmi kliniklerinin %80'i için yeterli
- "Premium+" / "Studio Pro" → en üst segment, "doktorun kendi yüzü/sesiyle Arapça konuşuyor" demosuyla satış kapatır
- Üç katmanlı yapı (Free / Premium / Premium+) klasik SaaS upsell hunisi

**4. Teknik risk**
- Lip-sync API'leri (HeyGen, Sync.so) hala olgunlaşıyor — bazı yüzlerde/açılarda hatalı sonuç verebilir
- Standart pakete koyup bozuk çıktı → tüm ürünün premium algısı zedelenir
- Ekstra katman → "beta" / "deneysel" rozetiyle sunabilirsin

### Mimari (onaylarsan uygularım)

```text
app_role enum:
  pending → user → premium → premium_plus (YENİ)

Video modu seçimi:
  ☐ Altyazı       (Premium)
  ☐ TTS Dublaj    (Premium - genel ses)
  ☐ Voice Clone   (Premium+ - kullanıcının kendi sesi)
  ☐ Lip-Sync      (Premium+ - dudak senkronu)
```

### Teknik Plan (kısaca)

**1. Veritabanı**
- `app_role` enum'a `premium_plus` ekle
- `voice_clones` tablosu: `id, user_id, elevenlabs_voice_id, sample_url, name, status` — kullanıcının klonlanmış sesini sakla
- `video_translations.mode` enum: `subtitle | dub | clone_dub | lipsync`

**2. Edge Functions (yeni)**
- `clone-voice` — kullanıcı 1-3 dakikalık ses örneği yükler → ElevenLabs Voice Cloning API → `voice_id` döner
- `process-video-translation` güncellemesi — `clone_dub` modunda kullanıcının kendi `voice_id`'sini kullan
- `generate-lipsync` — Sync.so veya HeyGen API'ye dublajlı ses + orijinal video gönder → dudak senkronlu video al

**3. UI**
- Settings altında yeni sekme: **"Ses Klonum"** — örnek kayıt yükle, klonu test et, sil
- Video Studio'da mod seçici genişler:
  - "🎙️ Kendi sesimle dublaj (Premium+)"
  - "👄 Dudak senkronu (Premium+)"
- Premium+ olmayan kullanıcıya kilitli buton + "Yükselt" CTA

**4. Gerekli secret'lar**
- `SYNC_SO_API_KEY` veya `HEYGEN_API_KEY` (lip-sync için — sen seçeceksin)
- ElevenLabs zaten var (Voice Cloning aynı API key ile çalışır)

**5. Premium+ atama**
- Team Management'ta admin elle atar (ilk versiyon)
- Sonra Stripe ile self-service abonelik (Faz 3)

### Açık Karar

Hangi lip-sync sağlayıcısı? Üç seçenek:
- **Sync.so** — en yeni, en doğal sonuç, $1.5/dk
- **HeyGen** — pazar lideri, kurumsal görünüm, $2-3/dk, daha katı kullanım koşulları
- **D-ID** — daha ucuz ($0.50/dk) ama kalite biraz geride

Onayını ver, hangi sağlayıcıyla gideceğimizi söyle, plana son şeklini verip uygulamaya geçeyim.

<lov-actions>
<lov-suggestion message="Premium+ katmanı olarak ekle. Ses klonlama + lip-sync için Sync.so kullan (en doğal sonuç, makul fiyat). Settings'e 'Ses Klonum' sekmesi ekle, Video Studio'da yeni mod seçenekleri olsun.">Premium+ olarak ekle (Sync.so ile)</lov-suggestion>
<lov-suggestion message="Premium+ katmanı olarak ekle ama HeyGen API kullan — kurumsal kalite ve marka güveni daha önemli, fiyat farkını üstleniriz.">Premium+ olarak ekle (HeyGen ile)</lov-suggestion>
<lov-suggestion message="Standart Premium pakete dahil et — fiyatlama karmaşıklığı istemiyorum, herkese tam paket. Sync.so ile entegre et.">Standart pakete dahil et</lov-suggestion>
<lov-suggestion message="Şimdilik mevcut TTS dublajla devam edelim, lip-sync özelliğini ileride 10 gerçek müşteri talebi geldikten sonra ekleriz.">Şimdilik ekleme, beklesin</lov-suggestion>
</lov-actions>
