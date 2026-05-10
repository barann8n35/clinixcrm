import { useState } from "react";
import { ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScanCapture } from "@/components/scan/ScanCapture";
import { ScanReviewPanel, type ScanResult } from "@/components/scan/ScanReviewPanel";

export default function Scan() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [sourceImages, setSourceImages] = useState<string[]>([]);

  async function handleScan(images: string[]) {
    setLoading(true);
    setSourceImages(images);
    try {
      const { data, error } = await supabase.functions.invoke("scan-handwriting", { body: { images } });
      if (error) throw error;
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      setResult(data as ScanResult);
      toast.success("Not okundu — bilgileri kontrol edin");
    } catch (e: any) {
      toast.error(e.message || "Tarama başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Görselden Kayıt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sekreter notunun fotoğrafını çek — AI hasta, randevu ve hatırlatıcıları otomatik çıkarsın.</p>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto w-full">
        {!result ? (
          <ScanCapture onScan={handleScan} loading={loading} />
        ) : (
          <ScanReviewPanel result={result} onReset={() => setResult(null)} />
        )}
      </div>
    </div>
  );
}
