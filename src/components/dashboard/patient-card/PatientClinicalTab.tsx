import { useEffect, useRef, useState } from "react";
import { Stethoscope, FileText, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplatePicker } from "@/components/clinical/TemplatePicker";
import { VoiceDictateButton } from "@/components/clinical/VoiceDictateButton";

interface Props {
  patientId: string;
}

export function PatientClinicalTab({ patientId }: Props) {
  const [examNotes, setExamNotes] = useState("");
  const [epicrisis, setEpicrisis] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const examRef = useRef<HTMLTextAreaElement>(null);
  const epiRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("patients")
        .select("examination_notes, epicrisis")
        .eq("id", patientId)
        .maybeSingle();
      if (cancelled) return;
      const d = data as any;
      setExamNotes(d?.examination_notes || "");
      setEpicrisis(d?.epicrisis || "");
      setDirty(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({ examination_notes: examNotes, epicrisis } as any)
      .eq("id", patientId);
    setSaving(false);
    if (error) { toast.error("Kayıt başarısız"); return; }
    setDirty(false);
    toast.success("Klinik notlar kaydedildi ✅");
  }

  function insertAtCursor(
    ref: React.RefObject<HTMLTextAreaElement>,
    current: string,
    setter: (v: string) => void,
    text: string,
  ) {
    const el = ref.current;
    const sep = current && !current.endsWith("\n") ? "\n\n" : "";
    if (!el) {
      setter(current + sep + text);
    } else {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const before = current.slice(0, start);
      const after = current.slice(end);
      const insertSep = before && !before.endsWith("\n") ? "\n\n" : "";
      const next = before + insertSep + text + after;
      setter(next);
      requestAnimationFrame(() => {
        const pos = (before + insertSep + text).length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    }
    setDirty(true);
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-5 p-1">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
            </div>
            <h4 className="text-[12px] font-bold text-foreground tracking-tight">Muayene Notu</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <VoiceDictateButton onTranscript={(t) => insertAtCursor(examRef, examNotes, setExamNotes, t)} />
            <TemplatePicker category="examination" onInsert={(t) => insertAtCursor(examRef, examNotes, setExamNotes, t)} />
          </div>
        </div>
        <textarea
          ref={examRef}
          value={examNotes}
          onChange={(e) => { setExamNotes(e.target.value); setDirty(true); }}
          placeholder="Anamnez, fizik muayene bulguları, tanı, plan..."
          rows={6}
          className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h4 className="text-[12px] font-bold text-foreground tracking-tight">Epikriz (Ameliyat Sonrası)</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <VoiceDictateButton onTranscript={(t) => insertAtCursor(epiRef, epicrisis, setEpicrisis, t)} />
            <TemplatePicker category="epicrisis" onInsert={(t) => insertAtCursor(epiRef, epicrisis, setEpicrisis, t)} />
          </div>
        </div>
        <textarea
          ref={epiRef}
          value={epicrisis}
          onChange={(e) => { setEpicrisis(e.target.value); setDirty(true); }}
          placeholder="Operasyon özeti, kullanılan teknik, komplikasyon, post-op öneriler, ilaç tedavisi..."
          rows={8}
          className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
        />
      </motion.div>

      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Kaydediliyor..." : "Klinik Notları Kaydet"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
