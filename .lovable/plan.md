# Ekip Üyelerini Klinik Bazlı Gruplama

## Amaç
`Ekip Yönetimi` sayfasındaki düz "Ekip Üyeleri" listesini, her klinik sahibi (doktor) altında kendi sekreteri / asistanı / eş doktoru görünecek şekilde gruplandırmak.

## Yapılacaklar

### 1. `src/pages/TeamManagement.tsx`
- `clinic_members` tablosunu (owner_user_id, member_user_id, member_role) yükle.
- Aktif üyeleri şu gruplara böl:
  - **Klinik grupları**: Her klinik sahibi (admin / doctor / premium / premium_plus rolündeki kişiler) için ayrı bir kart.
    - Başlıkta klinik sahibinin adı + rol badge'i.
    - Altında o klinik sahibinin `clinic_members` üzerinden bağlı tüm üyeleri (sekreter / doktor / asistan).
    - Her satırın sağında mevcut rol seçimi + paket atama + sil butonları (bugünkü `activeMembers` satırı aynen taşınır).
  - **Bağımsız üyeler**: Hiçbir kliniğe bağlı olmayan ve kendisi de klinik sahibi olmayan üyeler için ayrı "Bağımsız" bölümü.
- Pending (onay bekleyenler) bölümü değişmiyor (üstte aynen kalır).

### 2. Görsel Düzen
- Her klinik için `rounded-2xl border` kart:
  ```
  ┌─────────────────────────────────────────────┐
  │ [Building2] Dr. Ercan Çetin       [Doktor] │  3 üye
  │  ercan@klinik.com                           │
  ├─────────────────────────────────────────────┤
  │  ▸ Eş Doktor (Doktor)         [rol] [paket]│
  │  ▸ Sekreter Ayşe (Sekreter)   [rol] [paket]│
  │  ▸ Asistan Veli (Asistan)     [rol] [paket]│
  └─────────────────────────────────────────────┘
  ```
- Boş klinik için "Henüz üye eklenmemiş" placeholder + `ClinicMembersPanel`'a yönlendirme ipucu.

### 3. `ClinicMembersPanel` (alt panel)
- Mevcut panel sayfanın altında "Klinik Üyelikleri (Yönetim)" başlığıyla kalır — buradan ekleme/kaldırma yapılabilir.
- Panelde değişiklik yapıldığında üstteki gruplandırmanın da yenilenmesi için `onRefresh` callback'i `fetchMembers + fetchClinicLinks` çağıracak.

## Teknik Notlar
- Tek bir Supabase çağrısı eklenir: `supabase.from("clinic_members").select("owner_user_id, member_user_id, member_role")`.
- Gruplama tamamen frontend'de yapılır, DB değişmez.
- Bir kullanıcı birden çok kliniğe bağlıysa (çoklu sekreter senaryosu) her klinik kartında görünür — bu kasıtlı, mevcut multi-tenant mantığıyla uyumlu.

## Dosyalar
- `src/pages/TeamManagement.tsx` (ana değişiklik)
- DB / migration / `ClinicMembersPanel` iç mantığı **değişmez**.
