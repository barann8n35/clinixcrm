import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
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

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-2xl font-display font-extrabold mb-2">Gizlilik Politikası</h1>
        <p className="text-muted-foreground text-sm mb-8">Son güncelleme: Mayıs 2026</p>

        <section className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">1. Veri Sorumlusu</h2>
            <p>Clinix AI (bundan böyle "Clinix" veya "biz" olarak anılacaktır), clinix.ai alan adı üzerinden sunulan klinik yönetim ve yapay zeka asistan yazılımının işleticisidir. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">2. Toplanan Veriler</h2>
            <p>Hizmetimizi kullanırken aşağıdaki kişisel veriler işlenebilmektedir:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Klinik yöneticisi verileri:</strong> Ad, soyad, e-posta adresi, telefon numarası.</li>
              <li><strong>Hasta verileri:</strong> Klinik tarafından sisteme girilen ad, soyad, telefon numarası, randevu bilgileri ve notlar. Bu veriler yalnızca ilgili kliniğin erişimine açıktır.</li>
              <li><strong>İletişim verileri:</strong> WhatsApp, Instagram ve Facebook Messenger kanalları üzerinden iletilen mesaj içerikleri (yalnızca AI yanıt üretimi amacıyla işlenir).</li>
              <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgisi, oturum süreleri.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">3. Verilerin İşlenme Amacı</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Klinik yönetim hizmetlerinin sunulması</li>
              <li>Yapay zeka destekli randevu ve hasta iletişiminin sağlanması</li>
              <li>Sistem güvenliği ve hata tespiti</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">4. Verilerin Saklanması</h2>
            <p>Tüm veriler Supabase altyapısı üzerinde şifrelenmiş olarak saklanmaktadır. Her kliniğin verileri, Row Level Security (RLS) politikaları ile diğer kliniklerden tam olarak izole edilmektedir. Hizmet sözleşmesinin sona ermesinden itibaren 30 gün içinde taleple veriler silinir.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">5. Üçüncü Taraf Hizmetler</h2>
            <p>Hizmetimiz aşağıdaki üçüncü taraf platformlarla entegre çalışmaktadır:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Meta (Facebook, Instagram, WhatsApp):</strong> Mesajlaşma kanalları için. Meta'nın gizlilik politikası geçerlidir.</li>
              <li><strong>OpenAI:</strong> AI yanıt üretimi için. Mesaj içerikleri OpenAI API'sine iletilir.</li>
              <li><strong>Supabase:</strong> Veri depolama ve kimlik doğrulama için.</li>
              <li><strong>ElevenLabs:</strong> Sesli AI asistan özelliği için (Premium+ paketi).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">6. KVKK Kapsamında Haklarınız</h2>
            <p>KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlendiyse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, verilerin silinmesini veya yok edilmesini isteme haklarına sahipsiniz. Talepleriniz için: <strong>kvkk@clinix.ai</strong></p>
          </div>

          <div>
            <h2 className="font-semibold text-base text-foreground mb-2">7. İletişim</h2>
            <p>Gizlilik politikamıza ilişkin sorularınız için: <strong>info@clinix.ai</strong></p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
