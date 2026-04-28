import { motion } from "framer-motion";
import VoiceAgentTab from "@/components/settings/VoiceAgentTab";
import { FeatureLock } from "@/components/premium/FeatureLock";
import { useRole } from "@/hooks/useRole";

const VoiceAgentPage = () => {
  const { isPremiumPlus } = useRole();

  return (
    <div className="p-4 md:p-8 space-y-6 gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
          Sesli AI Asistan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          7/24 telefonları açan dijital sekreterinizi yapılandırın
        </p>
      </motion.div>

      {isPremiumPlus ? (
        <VoiceAgentTab />
      ) : (
        <FeatureLock
          tier="premium_plus"
          featureName="Sesli AI Asistan"
          description="7/24 telefonları açan, randevu alan, doktorun kendi sesiyle dış arama yapan dijital sekreter. Premium+ paketine dahildir."
        />
      )}
    </div>
  );
};

export default VoiceAgentPage;
