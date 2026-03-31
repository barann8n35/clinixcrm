import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Send, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface LogEntry {
  id: number;
  created_at: string | null;
  patient_id: string | null;
  patient_name: string | null;
  unknown_question: string | null;
  answer: string | null;
}

const KnowledgeBase = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("learning_logs")
      .select("*")
      .is("answer", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Veriler yüklenemedi");
    } else {
      setLogs((data as LogEntry[]) || []);
    }
    setLoading(false);
  }

  async function handleSave(id: number) {
    const text = answers[id]?.trim();
    if (!text) {
      toast.error("Lütfen bir cevap yazın");
      return;
    }

    setSaving(id);
    const { error } = await supabase
      .from("learning_logs")
      .update({ answer: text } as any)
      .eq("id", id);

    if (error) {
      toast.error("Kaydetme başarısız oldu");
    } else {
      toast.success("Cevap kaydedildi ✅");
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setSaving(null);
  }

  return (
    <div className="p-4 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground flex items-center gap-2.5 tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          Bilgi Bankası
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI'ın cevaplayamadığı sorular — cevap ekleyerek AI'ı eğitin.
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-success/10 flex items-center justify-center mb-5">
            <Sparkles className="w-9 h-9 text-success" />
          </div>
          <h3 className="text-lg font-bold font-display text-foreground">Tüm sorular cevaplandı!</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">Cevaplanmamış soru kalmadı. AI asistanınız her soruya yanıt verebilir durumda.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {logs.length} cevaplanmamış soru
          </p>
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-card card-interactive"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {log.unknown_question || "Soru yok"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {log.patient_name && (
                      <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-medium">
                        {log.patient_name}
                      </span>
                    )}
                    {log.created_at && (
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Cevabı buraya yazın..."
                  value={answers[log.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [log.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(log.id);
                  }}
                  className="flex-1 text-sm rounded-xl"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave(log.id)}
                  disabled={saving === log.id || !answers[log.id]?.trim()}
                  className="shrink-0 rounded-xl"
                >
                  {saving === log.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
