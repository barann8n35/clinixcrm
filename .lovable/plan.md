# Klinik Gruplama Mantığını Düzelt

## Sorun
`TeamManagement.tsx`'teki gruplama, rolü `admin / doctor / premium / premium_plus` olan herkesi otomatik olarak "klinik sahibi" sayıyor. Ama bu kullanıcılar başka bir kliniğe **üye** olarak bağlandığında (örn. baran'ın asistanı olarak), ikinci kez kendi adlarına boş bir klinik kartı oluşturuyor. Sonuç: tek gerçek klinik varken 3 klinik kartı görünüyor.

## Düzeltme

`src/pages/TeamManagement.tsx` içindeki klinik sahibi tespitini şu şekilde değiştir:

**Bir kullanıcı klinik sahibidir ⇔**
1. Rolü `admin / doctor / premium / premium_plus` arasında, **VE**
2. `clinic_members` tablosunda **herhangi bir owner'a member olarak bağlı değil** (yani `member_user_id` olarak görünmüyor), **VEYA** zaten kendi adına altında üye(ler) var (`owner_user_id` olarak en az 1 kayıt).

Pratik kural (basit ve net):
```
isOwner = OWNER_ROLES.has(role) && !memberOfClinicIds.has(user_id)
```

Bir kullanıcı başka bir kliniğin üyesi olarak işaretlenmişse, kendi adına ayrı klinik kartı **açılmaz** — sadece bağlı olduğu kliniğin altında görünür. Rol badge'i (örn. "Premium+") kart içinde zaten gösterildiği için bilgi kaybı olmaz.

## Beklenen Sonuç
Mevcut DB durumuyla:
- **Baran kliniği** kartı altında 3 üye: dila (Premium+), baran.n8n35 (Premium+), begum (Personel).
- Dila ve baran.n8n35 için ayrı klinik kartı **açılmaz**.

## Dosyalar
- `src/pages/TeamManagement.tsx` — sadece `owners` ve `unassigned` filtre satırları değişecek. DB / RLS / migration değişmez.
