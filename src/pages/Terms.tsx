import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-foreground leading-none">Clinix</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Medical CRM</p>
            </div>
          </button>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-lg">Geri Dön</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-display font-extrabold mb-2">Kullanım Koşulları</h1>
        <p className="text-muted-foreground text-sm mb-8">Son güncelleme: Mayıs 2026</p>

        <section className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">1. Hizmet Tanımı</h2>
            <p>Clinix AI, klinikler ve sağlık profesyonelleri için geliştirilmiş yapay zeka destekli CRM ve hasta iletişim platformudur. Hizmetlerimiz; hasta yönetimi, randevu takibi, WhatsApp/Instagram/Facebook Messenger AI asistanı, sesli randevu sistemi ve analitik araçlarını kapsamaktadır.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">2. Abonelik ve Ödeme</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hizmetler aylık abonelik modeliyle sunulmaktadır: Standart (₺2.490/ay), Premium (₺6.990/ay), Premium+ (₺14.990/ay).</li>
              <li>Abonelikler otomatik olarak yenilenir. İptal talebi bir sonraki fatura döneminden en az 3 iş günü önce iletilmelidir.</li>
              <li>Ödemeler iyzico altyapısı üzerinden güvenli olarak gerçekleştirilir.</li>
              <li>Fiyatlar KDV dahildir. Clinix, fiyat değişikliklerini en az 30 gün öncesinden bildirme hakkını saklı tutar.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">3. Kullanım Koşulları</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hesabınız yalnızca klinik yönetim amaçlı kullanılabilir.</li>
              <li>Hasta verilerinin işlenmesinde ilgili klinik, KVKK kapsamında veri işleyen sıfatıyla sorumludur.</li>
              <li>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz. Şüpheli erişim durumunda derhal bildirin.</li>
              <li>Platformu yasadışı amaçlarla, spam veya kötüye kullanım için kullanamazsınız.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">4. Hizmet Sürekliliği ve Sorumluluk Sınırlaması</h2>
            <p>Clinix, makul teknik önlemleri alarak hizmetin sürekliliğini sağlamayı hedefler. Üçüncü taraf API'leri (Meta, OpenAI, Twilio) kaynaklı kesintilerden doğan zararlar için Clinix'in sorumluluğu aylık abonelik ücretiyle sınırlıdır. Tıbbi kararlar için platformun kullanılması önerilmez; sistem idari ve iletişim desteği amacıyla tasarlanmıştır.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">5. Fikri Mülkiyet</h2>
            <p>Platform, arayüz tasarımı ve AI modelleri Clinix AI'ya aittir. Klinik tarafından platforma yüklenen içerikler (hasta notları, bilgi bankası vb.) ilgili kliniğe aittir.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">6. Sözleşmenin Feshi</h2>
            <p>Kullanım koşullarının ihlali halinde Clinix, önceden bildirimde bulunmaksızın hesabı askıya alma veya sonlandırma hakkını saklı tutar. İptal durumunda mevcut dönem ücreti iade edilmez.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">7. Uygulanacak Hukuk</h2>
            <p>Bu sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">8. İletişim</h2>
            <p>Sorularınız için: <strong>info@clinix.ai</strong></p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Terms;
