
Kullanıcı tüm 4 kritik kararı verdi. Tam premium paket onaylandı. Planı netleştirip uygulamaya hazır hale getiriyorum.

## Video Stüdyo — Uygulama Planı

Sağlık turizmi için premium video çeviri modülü. Kullanıcı seçimleri: **Hepsi mevcut (altyazı + TTS dublaj)**, **kullanıcı serbest dil ekleyebilir**, **yeni `premium` role**, **hem galeri hem hasta panelinden gönderim**.

### Akış
```text
Yükle → Mod seç (Altyazı / Dublaj) → Hedef dilleri seç
   → Transkribe (Lovable AI) → Çevir (Lovable AI)
   → [Altyazı] SRT üret  veya  [Dublaj] ElevenLabs TTS + ses bindir
   → Storage → Galeri / Hasta paneli "Video Gönder"
```

### 1. Veritabanı (migration)
- `app_role` enum'una **`premium`** değeri ekle
- `videos` tablosu: `id, user_id, title, original_url, source_language, duration_seconds, file_size, status, created_at`
- `video_translations` tablosu: `id, video_id, target_language, target_language_label, mode ('subtitle'|'dub'), status ('pending'|'processing'|'completed'|'failed'), output_url, subtitle_url, transcript_text, translated_text, error_message, created_at, completed_at`
- Storage bucket: **`clinic-videos`** (private)
- RLS: kullanıcı yalnızca kendi `videos` ve `video_translations` kayıtlarına erişir; admin hepsini görür
- Realtime: `video_translations` tablosuna publication eklenir (canlı progress için)

### 2. Edge Functions
- **`process-video-translation`** — orkestrasyon (transkribe → çevir → mod'a göre dallan)
- **`transcribe-video`** — Lovable AI (Gemini multimodal) ile sesi metne çevir
- **`translate-text`** — Lovable AI ile tıbbi terminoloji uyumlu çeviri + SRT formatı
- **`generate-dubbed-audio`** — ElevenLabs `eleven_multilingual_v2` ile hedef dilde ses üret
- Secret: **`ELEVENLABS_API_KEY`** (kullanıcıdan istenecek; sadece dublaj için gerekli — altyazı modu Lovable AI ile çalışır)

### 3. UI

**Yeni sayfa: `/video-studio`**
- Sürükle-bırak yükleme + önizleme
- Mod toggle: **Altyazı** / **Dublaj** (her video için ayrı seçilebilir)
- Hedef dil çoklu seçici:
  - Hazır chip'ler: AR, EN, RU, DE, FR, FA, ES (sağlık turizmi standartı)
  - **"+ Dil ekle"** butonu — kullanıcı kendi dil kodu/adı tanımlayabilir
- İşlem kartları: canlı progress bar, status badge, hata gösterimi (realtime)
- Tamamlanan videolar galerisi: önizleme oynatıcı, indir, link kopyala, sil

**Sidebar**
- Yeni link: **"Video Stüdyo"** (Video ikonu + premium rozet)

**Hasta Paneli entegrasyonu (`PatientPanel.tsx`)**
- "Video Gönder" butonu → modal açılır → kullanıcının galerisi listelenir → seçilen videonun linki WhatsApp mesajı olarak hastaya iletilir

### 4. Premium Erişim
- `app_role` enum'a `premium` eklenir
- `useRole` hook'una `isPremium` getter'ı eklenir
- `/video-studio` route'u `isPremium || isAdmin` değilse "Premium" upgrade ekranı gösterir
- Team Management sayfasında admin kullanıcılara `premium` rolü atayabilir

### 5. i18n
- TR/EN çevirileri eklenir: "Video Stüdyo", "Yeni video yükle", "Hedef dilleri seç", "Altyazı modu", "Dublaj modu", "Dil ekle", "İşleniyor", "Tamamlandı" vb.

### Karar / Açık Konular
- **ElevenLabs API Key**: kullanıcının https://elevenlabs.io üzerinden bir key alıp Lovable'a girmesi gerekecek. Onay sonrası `add_secret` ile isteyeceğim.
- **Dosya boyutu sınırı**: ilk versiyonda 50MB üst sınır (Supabase Storage standart upload sınırı). Daha büyükler için resumable upload Faz 2'de.
- **Süre sınırı**: ilk versiyonda 5 dakika video önerilir (transkripsiyon + çeviri + dublaj toplam ~10 dk işlem süresi).

### Uygulama Sırası
1. Migration: `premium` role + `videos` + `video_translations` tabloları + `clinic-videos` bucket + RLS + realtime
2. ElevenLabs API key talep et (sadece dublaj çalışsın diye gerekli)
3. Edge functions deploy
4. UI sayfası + sidebar link + premium gate
5. Hasta paneline "Video Gönder" butonu
6. i18n çevirileri

Onaylarsan başlıyorum. Tek soru: **ElevenLabs hesabın hazır mı, yoksa hesap açma adımlarını da sana ileteyim mi?**
