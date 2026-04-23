import { motion } from "framer-motion";
import { Check, Sparkles, Phone, MessageSquare, ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  id: "standard" | "premium" | "premium_plus";
  name: string;
  tagline: string;
  price: string;
  period: string;
  highlight?: boolean;
  icon: typeof Check;
  features: { text: string; included: boolean }[];
  cta: string;
  ribbon?: string;
}

const PLANS: Plan[] = [
  {
    id: "standard",
    name: "Standart",
    tagline: "CRM ve dijital giriş",
    price: "₺2.490",
    period: "/ay",
    icon: Check,
    cta: "Başla",
    features: [
      { text: "Hasta CRM ve kayıtlar", included: true },
      { text: "Manuel takvim & randevu yönetimi", included: true },
      { text: "Tüm Tıbbi Branşlara Uyumlu Modüler Altyapı", included: true },
      { text: "Gelişmiş Randevu Raporlaması", included: true },
      { text: "SMS/Whatsapp Randevu Hatırlatıcı", included: true },
      { text: "Temel hatırlatmalar (push & e-posta)", included: true },
      { text: "WhatsApp AI Bot", included: false },
      { text: "RAG Bilgi Bankası otomatik cevap", included: false },
      { text: "Sesli AI Asistan (Twilio)", included: false },
      { text: "Doktorun kendi sesiyle dış arama", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Yazılı AI Otomasyonu",
    price: "₺6.990",
    period: "/ay",
    highlight: true,
    ribbon: "EN POPÜLER",
    icon: MessageSquare,
    cta: "Premium'a Yükselt",
    features: [
      { text: "Standart pakete dahil her şey", included: true },
      { text: "WhatsApp Business AI Bot", included: true },
      { text: "n8n ile otomatik randevu alma", included: true },
      { text: "RAG Bilgi Bankası ile akıllı cevaplar", included: true },
      { text: "Yapay Zeka Destekli Klinik Bilgi Bankası (SSS Otomatik Yanıt)", included: true },
      { text: "Video Stüdyo: AI Destekli Çoklu Dil Altyazı Çevirisi", included: true },
      { text: "Instagram & Facebook entegrasyonu", included: true },
      { text: "Kampanya ve toplu mesaj", included: true },
      { text: "Sesli AI Asistan (Twilio)", included: false },
      { text: "Doktorun kendi sesiyle dış arama", included: false },
    ],
  },
  {
    id: "premium_plus",
    name: "Premium+",
    tagline: "VIP — Sesli Dijital Sekreter",
    price: "₺14.990",
    period: "/ay",
    ribbon: "VIP",
    icon: Phone,
    cta: "VIP'e Geç",
    features: [
      { text: "Premium pakete dahil her şey", included: true },
      { text: "7/24 sesli AI resepsiyonist (Twilio + ElevenLabs)", included: true },
      { text: "Doktorun KENDİ SESİYLE dış arama", included: true },
      { text: "Otomatik randevu hatırlatma araması", included: true },
      { text: "Cevapsız mesaj sonrası otomatik arama", included: true },
      { text: "Yeni lead karşılama araması", included: true },
      { text: "Video Stüdyo & ses klonlama", included: true },
      { text: "Çağrı kayıtları & transkript", included: true },
    ],
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-foreground leading-none">Clinix</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Medical CRM</p>
            </div>
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(session ? "/dashboard" : "/auth")}
            className="rounded-lg"
          >
            {session ? "Panele Dön" : "Giriş Yap"}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" />
            Klinik için tüm-bir-arada
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mb-4 tracking-tight">
            Klinik dijitalleşmesi için <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
              üç adımlık paketleme
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manuel CRM'den 7/24 sesli AI sekretere — kliniğin büyüklüğüne göre seç, istediğin zaman yükselt.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-3xl border p-7 flex flex-col ${
                plan.highlight
                  ? "border-primary shadow-elegant bg-gradient-to-br from-primary/5 via-card to-card scale-[1.02]"
                  : "border-border/60 bg-card shadow-card"
              }`}
            >
              {plan.ribbon && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    plan.id === "premium_plus"
                      ? "bg-gradient-to-r from-purple-500 to-primary text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {plan.ribbon}
                </div>
              )}

              <div className="mb-5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                    plan.id === "premium_plus"
                      ? "bg-gradient-to-br from-purple-500/15 to-primary/15 text-purple-600"
                      : plan.highlight
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <plan.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-extrabold text-xl text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-display font-extrabold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <Button
                onClick={() => navigate(session ? "/dashboard" : "/auth")}
                className={`rounded-xl gap-2 mb-6 ${
                  plan.highlight
                    ? ""
                    : plan.id === "premium_plus"
                    ? "bg-gradient-to-r from-purple-500 to-primary hover:opacity-90 text-white"
                    : ""
                }`}
                variant={plan.highlight || plan.id === "premium_plus" ? "default" : "outline"}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px]">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        f.included ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/40"
                      }`}
                    >
                      {f.included ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="text-[10px]">—</span>}
                    </div>
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* VIP Feature Spotlight */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 md:mt-20 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/8 via-primary/5 to-card p-8 md:p-12 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center mb-4 shadow-lg">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground mb-3">
            Doktorun kendi sesiyle, 7/24 telefonda
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
            Premium+ paketinde ElevenLabs ile doktorun sesini klonlıyoruz. Sistem, hasta hatırlatma aramalarını
            doktorun kendi sesiyle yapıyor — hasta cevap verdiğinde "Ercan Hoca'nın asistanı arıyor" demek yerine,
            doktorun kendisinin aradığını duyuyor.
          </p>
          <Button
            onClick={() => navigate(session ? "/dashboard" : "/auth")}
            className="rounded-xl gap-2 bg-gradient-to-r from-purple-500 to-primary hover:opacity-90 text-white"
          >
            VIP Paketi Aktive Et <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-12">
          Tüm fiyatlara KDV dahil değildir. Yıllık ödemede %20 indirim. Kurumsal teklifler için bizimle iletişime geçin.
        </p>
      </main>
    </div>
  );
};

export default Pricing;
