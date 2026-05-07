# Klinik Not Şablonları

Muayene notu ve epikriz alanlarında sık kullanılan kalıpları tek tıkla ekleyebileceğiniz, kullanıcıya özel ve düzenlenebilir bir şablon sistemi.

## Özellikler

- İki kategori: **Muayene** ve **Epikriz**
- Şablon listesi: başlık + içerik (çok satırlı)
- Klinik sekmesinde her textarea üstünde **"Şablonlar"** popover butonu — tıklayınca o kategoriye ait şablonlar listelenir
- Tıklanan şablon imleç konumuna eklenir (mevcut metni silmez, sonuna/araya ekler)
- **"+ Yeni şablon"** butonu ile aynı popover içinden hızlı kayıt
- **"Yönet"** linki ile Ayarlar > Klinik Şablonları sekmesine gider (CRUD: ekle/düzenle/sil)
- Kullanıcıya özel (RLS ile user_id bazlı), her hekim kendi kalıplarını yönetir
- İlk açılışta otomatik 6 örnek şablon seed edilir (3 muayene + 3 epikriz: Genel muayene, Baş ağrısı anamnez, Post-op kontrol; Kraniyotomi, Lomber diskektomi, Tümör rezeksiyonu)

## Teknik

**Yeni tablo: `clinical_templates`**
```
id uuid PK
user_id uuid (auth.uid() default)
category text ('examination' | 'epicrisis')
title text
content text
sort_order int default 0
created_at, updated_at timestamptz
```
RLS: kullanıcı yalnızca kendi kayıtlarını görür/yönetir (admin tüm).

**Frontend:**
- `src/components/clinical/TemplatePicker.tsx` — Popover+arama+liste+hızlı ekle. Props: `category`, `onInsert(text)`
- `PatientClinicalTab.tsx` güncellenir: her textarea üstünde küçük "Şablonlar" chip butonu; insert imleç pozisyonuna yapılır (textarea ref + selectionStart)
- `src/components/settings/ClinicalTemplatesTab.tsx` — Tam CRUD ekranı (kategori sekmeleri, inline düzenle, sürükle-sırala basit ↑↓ butonlarıyla)
- `Settings.tsx`'e yeni sekme: **"Şablonlar"**
- İlk yüklemede kullanıcının hiç şablonu yoksa örnek 6 kayıt insert edilir (client-side, sessizce)

**Veri akışı:** Doğrudan supabase client; basit `useEffect` fetch + local state. Kayıt sonrası listeyi yeniden çek.
