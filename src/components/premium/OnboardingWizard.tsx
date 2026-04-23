import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Calendar, MessageSquare, Phone, Mic, BookOpen, Users } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "clinix:onboarding_completed_v1";

interface Step {
  icon: typeof Check;
  title: string;
  body: string;
  cta?: { label: string; path: string };
}

function buildSteps(tier: "standard" | "premium" | "premium_plus"): Step[] {
  const common: Step[] = [
    {
      icon: Calendar,
      title: "Takvim & Randevular",
      body: "Hastalarınızın randevularını manuel veya AI ile yönetin. İlk randevunuzu eklemek ister misiniz?",
      cta: { label: "Takvime Git", path: "/calendar" },
    },
    {
      icon: Users,
      title: "Hasta CRM",
      body: "Tüm hasta kayıtlarınız tek yerde. Notlar, tedavi geçmişi ve iletişim bilgileri.",
      cta: { label: "Hastalara Git", path: "/patients" },
    },
  ];

  if (tier === "standard") {
    return [
      {
        icon: Sparkles,
        title: "Clinix'e Hoş Geldiniz 👋",
        body: "Standart paketinizle CRM, takvim ve manuel hatırlatmaları kullanabilirsiniz. Premium'a geçerek WhatsApp AI bot ekleyebilirsiniz.",
      },
      ...common,
    ];
  }

  if (tier === "premium") {
    return [
      {
        icon: Sparkles,
        title: "Premium'a Hoş Geldiniz 🚀",
        body: "Yazılı AI gücüne sahipsiniz. WhatsApp botunuz hastalarınızla 7/24 yazışacak ve randevu alacak.",
      },
      ...common,
      {
        icon: MessageSquare,
        title: "WhatsApp AI Botu",
        body: "Ayarlar > Entegrasyonlar bölümünden WhatsApp Business numaranızı bağlayın. n8n workflow'u sizin için hazır.",
        cta: { label: "Entegrasyonlara Git", path: "/settings" },
      },
      {
        icon: BookOpen,
        title: "Bilgi Bankası",
        body: "AI'ın cevap veremediği soruları takip edin ve eğitin. Her cevap, botunuzu daha akıllı yapar.",
        cta: { label: "Bilgi Bankası", path: "/knowledge-base" },
      },
    ];
  }

  // premium_plus
  return [
    {
      icon: Sparkles,
      title: "VIP'e Hoş Geldiniz ⚡",
      body: "Premium+ paketiyle 7/24 sesli AI sekreteriniz aktif. Hastalar arar, sistem cevap verir; doktorunuzun kendi sesiyle dışarı arama yapar.",
    },
    ...common,
    {
      icon: Phone,
      title: "Sesli AI Asistanı",
      body: "Twilio numaranız ve ElevenLabs agent'ınız bağlandı. Ayarlar > Sesli Asistan bölümünden personayı ve karşılama mesajını özelleştirin.",
      cta: { label: "Sesli Asistan Ayarları", path: "/settings" },
    },
    {
      icon: Mic,
      title: "Doktorun Sesini Klonla",
      body: "Video Stüdyo'dan 1-3 dakikalık ses örneği yükleyerek doktorun sesini klonlayın. Otomatik aramalar bu sesle yapılacak.",
      cta: { label: "Video Stüdyo", path: "/video-studio" },
    },
    {
      icon: MessageSquare,
      title: "WhatsApp + Web + Instagram",
      body: "Tüm yazılı kanallarınız da aktif — gelen mesajlara AI yazılı cevap verir, gerekirse otomatik arama tetikler.",
      cta: { label: "Gelen Kutusu", path: "/messages" },
    },
  ];
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const { isPremiumPlus, isPremium, loading } = useRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const tier: "standard" | "premium" | "premium_plus" = isPremiumPlus
    ? "premium_plus"
    : isPremium
    ? "premium"
    : "standard";

  const steps = buildSteps(tier);

  useEffect(() => {
    if (loading || !user) return;
    const key = `${STORAGE_KEY}:${user.id}`;
    if (!localStorage.getItem(key)) {
      // Slight delay so dashboard has time to render
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [loading, user]);

  function complete() {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}:${user.id}`, new Date().toISOString());
    }
    setOpen(false);
    setStepIdx(0);
  }

  function next() {
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      complete();
    }
  }

  function gotoStepCta() {
    const cta = steps[stepIdx].cta;
    if (cta) {
      complete();
      navigate(cta.path);
    }
  }

  const step = steps[stepIdx];
  const Icon = step.icon;
  const tierMeta = {
    standard: { label: "Standart", color: "bg-muted text-muted-foreground" },
    premium: { label: "Premium", color: "bg-primary/15 text-primary" },
    premium_plus: { label: "Premium+ VIP", color: "bg-gradient-to-r from-purple-500/15 to-primary/15 text-purple-600" },
  }[tier];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && complete()}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tierMeta.color}`}>
              <Sparkles className="w-3 h-3" />
              {tierMeta.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {stepIdx + 1} / {steps.length}
            </span>
          </div>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
          <DialogDescription className="sr-only">Paketinize özel kurulum adımları</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepIdx}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="py-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-purple-500/10 flex items-center justify-center mb-4">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-foreground mb-2">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx ? "w-6 bg-primary" : i < stepIdx ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={complete} className="text-xs">
            Atla
          </Button>
          <div className="flex gap-2">
            {step.cta && (
              <Button variant="outline" size="sm" onClick={gotoStepCta} className="rounded-lg gap-1.5 text-xs">
                {step.cta.label}
              </Button>
            )}
            <Button size="sm" onClick={next} className="rounded-lg gap-1.5">
              {stepIdx === steps.length - 1 ? "Tamam" : "İleri"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
