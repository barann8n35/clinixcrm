import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FeatureLockProps {
  /** "premium" → WhatsApp AI; "premium_plus" → Sesli AI */
  tier: "premium" | "premium_plus";
  featureName: string;
  description?: string;
  children?: React.ReactNode;
}

const TIER_META = {
  premium: {
    badge: "Premium",
    color: "from-primary/20 to-primary/5",
    border: "border-primary/30",
    text: "text-primary",
    pkgLabel: "Premium (Yazılı AI)",
  },
  premium_plus: {
    badge: "Premium+",
    color: "from-purple-500/20 via-primary/15 to-primary/5",
    border: "border-purple-500/30",
    text: "text-purple-600",
    pkgLabel: "Premium+ (Sesli AI)",
  },
};

export function FeatureLock({ tier, featureName, description, children }: FeatureLockProps) {
  const navigate = useNavigate();
  const meta = TIER_META[tier];

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Blurred preview */}
      {children && (
        <div className="absolute inset-0 pointer-events-none select-none opacity-30 blur-sm overflow-hidden">
          {children}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center justify-center min-h-[400px] p-8"
      >
        <div className={`w-full max-w-md rounded-2xl border ${meta.border} bg-gradient-to-br ${meta.color} backdrop-blur-md p-8 shadow-elegant text-center`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-card/80 flex items-center justify-center mb-4 shadow-sm">
            <Lock className={`w-8 h-8 ${meta.text}`} />
          </div>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 ${meta.text} text-[11px] font-bold uppercase tracking-wider mb-3`}>
            <Sparkles className="w-3 h-3" />
            {meta.badge} Özellik
          </div>

          <h2 className="text-xl font-display font-extrabold text-foreground mb-2">
            {featureName}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {description ?? `Bu özellik ${meta.pkgLabel} paketine dahildir. Yükselterek anında erişim kazanabilirsiniz.`}
          </p>

          <Button
            onClick={() => navigate("/pricing")}
            className="rounded-xl gap-2 hover:scale-105 active:scale-95 transition-transform"
          >
            Paketleri İncele <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
