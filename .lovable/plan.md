# Görselden Otomatik Kayıt (OCR + AI Asistan)

Sekreterlerin elle aldığı notların fotoğrafını çekip sisteme yüklemesi → AI'ın görüntüyü okuyup yapılandırılmış veri çıkarması → tek tıkla **hasta kaydı**, **klinik not** veya **hatırlatıcı** olarak sisteme eklemesi.

## Akış

```
[📷 Fotoğraf Çek/Yükle]
        ↓
[Lovable AI Vision (Gemini 2.5 Flash) — handwriting OCR + structured extract]
        ↓
[Önizleme paneli: ayrıştırılmış alanlar düzenlenebilir]
   ├─ Hasta Adı / Telefon / Yaş / Şikayet
   ├─ Randevu tarihi/saati (varsa)
   ├─ Notlar (serbest metin)
   └─ Hatırlatıcılar (tarih + açıklama)
        ↓
[Onayla → Supabase'e yaz: patients / appointments / patient_reminders / notes]
```

## Yeni Özellikler

1. **Yeni sayfa: `/scan` (Hızlı Tarama)** — Sidebar'a "Görselden Kayıt" maddesi.
2. **`ScanCapture` bileşeni** — Mobil kamera (`<input type="file" accept="image/*" capture="environment">`) + drag-drop yükleme + çoklu sayfa desteği.
3. **Önizleme/Düzeltme paneli** — AI çıktısı form alanlarına dolar, sekreter doğrular.
4. **Hızlı erişim noktaları:**
   - Sidebar'da yeni "Görselden Kayıt" linki
   - Hasta detay modalında "Klinik Notu" sekmesinde "📷 Fotoğraftan Aktar" butonu (mevcut hastaya not ekleme)
   - Yeni hasta dialog'unda "📷 Karttan Doldur" butonu

## Teknik

**Yeni edge function: `scan-handwriting`**
- Input: `image_base64` (data URL) + `mode` ('patient' | 'note' | 'reminder' | 'auto')
- Lovable AI Gateway: `google/gemini-2.5-flash` (vision destekler, ücretsiz tier)
- Structured output (`tool_calls`) ile şu şemayı döner:
```ts
{
  patient?: { name, surname?, phone?, age?, gender?, complaint? },
  appointment?: { date_iso?, time?, doctor?, type? },
  reminders?: [{ remind_at_iso, note }],
  notes?: string,           // serbest metin
  raw_text: string,         // ham OCR çıktısı (referans için)
  confidence: 'high'|'medium'|'low'
}
```
- `LOVABLE_API_KEY` zaten mevcut, ek secret gerekmez.

**Yeni bileşenler:**
- `src/pages/Scan.tsx` — sayfa shell
- `src/components/scan/ScanCapture.tsx` — kamera/yükleme + tek görsel önizleme + "Tara" butonu
- `src/components/scan/ScanReviewPanel.tsx` — AI sonucunu düzenlenebilir form olarak gösterir, sekme bazlı (Hasta / Randevu / Hatırlatıcı / Not), her sekmenin kendi "Kaydet" butonu
- `src/components/scan/ImportFromPhotoButton.tsx` — yeniden kullanılabilir trigger (modal içinde), `onExtracted(data)` callback ile entegre olur

**Yazma mantığı (client-side):**
- Hasta: `patients` tablosuna insert (mevcut `id` formatı: `patient_<epoch>`)
- Randevu: `appointments` insert (`scheduled_at`, `doctor`, `patient_id`)
- Hatırlatıcı: `patient_reminders` insert (`patient_id`, `remind_at`, `note`)
- Not: mevcut hasta seçilmişse `patients.examination_notes`'a append, yoksa `internal_notes`

**Routing:**
- `App.tsx` içine `<Route path="scan" element={<Scan />} />` (DashboardLayout altında)
- `SidebarNav.tsx`'a "📷 Görselden Kayıt" item'i

**RLS:** Yeni tablo yok — mevcut `patients`/`appointments`/`patient_reminders` RLS politikaları (auth.uid() = user_id) zaten kullanıcıyı korur.

## Deneyim Detayları

- **Mobil-öncelikli:** sekreterler tablet/telefondan kullanır → büyük "Fotoğraf Çek" butonu, alt yapışkan kaydet barı
- **Çoklu görsel:** Tek seferde 3 karta kadar yükleme; AI hepsini tek istekte işler ve birleştirilmiş çıktı verir
- **Güven göstergesi:** AI `confidence: 'low'` dönerse alanlar sarı uyarıyla işaretlenir
- **Türkçe odaklı:** prompt Türkçe yazılır, TR isim/tarih kalıpları (DD.MM.YYYY) tanınır
- **Ham metin görünümü:** "Ham OCR" accordion ile sekreter orijinal okumayı görebilir

## Sınırlar

- Görüntü işleme tamamen Gemini Vision'a bırakılır — ek client-side OCR (Tesseract vb.) yok
- Çok kötü el yazısında düzenleme şart; "düzenleme yapmadan kaydet" engeli yok ama düşük güvende kullanıcı uyarısı var
- Resim depolanmaz (privacy) — sadece çıkarım yapılır, base64 işlenir ve atılır
