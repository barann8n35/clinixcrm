import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Bilgi Bankası
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI'ın cevaplayamadığı sorular — cevap ekleyerek AI'ı eğitin.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle className="w-12 h-12 text-success mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Tüm sorular cevaplandı!</h3>
          <p className="text-sm text-muted-foreground mt-1">Cevaplanmamış soru kalmadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {logs.length} cevaplanmamış soru
          </p>
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {log.unknown_question || "Soru yok"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {log.patient_name && (
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave(log.id)}
                  disabled={saving === log.id || !answers[log.id]?.trim()}
                  className="shrink-0"
                >
                  {saving === log.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
