import { Phone, MapPin, AlertCircle, Clock, Tag, X, Plus, StickyNote, DollarSign, CreditCard, TrendingUp, Bell, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
  tags: string[] | null;
  internal_notes: string | null;
}

const TAG_COLORS = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-success/10 text-success border-success/20",
  "bg-warning/10 text-warning border-warning/20",
  "bg-destructive/10 text-destructive border-destructive/20",
  "bg-accent text-accent-foreground border-border",
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Beklemede", color: "bg-warning/10 text-warning" },
  approved: { label: "Onaylandı", color: "bg-success/10 text-success" },
  cancelled: { label: "İptal", color: "bg-destructive/10 text-destructive" },
  rescheduled: { label: "Yeniden Planlandı", color: "bg-primary/10 text-primary" },
};

const MOCK_FINANCE = {
  totalSpent: 12450,
  pendingPayment: 3200,
  lastPayment: "2026-03-15",
};

interface PatientOverviewTabProps {
  patient: Patient | null;
  patientId: string;
  onPatientUpdate: (updater: (prev: Patient | null) => Patient | null) => void;
}

export function PatientOverviewTab({ patient, patientId, onPatientUpdate }: PatientOverviewTabProps) {
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [internalNotes, setInternalNotes] = useState(patient?.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [remindMe, setRemindMe] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>();
  const [reminderTime, setReminderTime] = useState("09:00");
  const [savingReminder, setSavingReminder] = useState(false);

  const saveNotes = useCallback(async (value: string) => {
    setSavingNotes(true);
    const { error } = await supabase.from("patients").update({ internal_notes: value }).eq("id", patientId);
    setSavingNotes(false);
    if (error) toast.error("Not kaydedilemedi");
  }, [patientId]);

  function handleNotesChange(value: string) {
    setInternalNotes(value);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => saveNotes(value), 1000);
  }

  async function handleSaveReminder() {
    if (!reminderDate || !patient) return;
    setSavingReminder(true);
    const [h, m] = reminderTime.split(":").map(Number);
    const remindAt = new Date(reminderDate);
    remindAt.setHours(h, m, 0, 0);
    const { error } = await supabase.from("patient_reminders" as any).insert({
      patient_id: patientId,
      note: internalNotes,
      remind_at: remindAt.toISOString(),
    });
    setSavingReminder(false);
    if (error) { toast.error("Hatırlatıcı kaydedilemedi"); return; }
    toast.success("🔔 Hatırlatıcı kaydedildi!");
    setRemindMe(false);
    setReminderDate(undefined);
  }

  async function handleAddTag() {
    const tag = newTag.trim();
    if (!tag || !patient) return;
    const currentTags = patient.tags || [];
    if (currentTags.includes(tag)) { setNewTag(""); return; }
    const updated = [...currentTags, tag];
    const { error } = await supabase.from("patients").update({ tags: updated }).eq("id", patientId);
    if (error) { toast.error("Etiket eklenemedi"); return; }
    onPatientUpdate(prev => prev ? { ...prev, tags: updated } : null);
    setNewTag("");
    setShowTagInput(false);
  }

  async function handleRemoveTag(tag: string) {
    if (!patient) return;
    const updated = (patient.tags || []).filter(t => t !== tag);
    const { error } = await supabase.from("patients").update({ tags: updated }).eq("id", patientId);
    if (error) { toast.error("Etiket silinemedi"); return; }
    onPatientUpdate(prev => prev ? { ...prev, tags: updated } : null);
  }

  const rawTags = patient?.tags;
  const tags: string[] = Array.isArray(rawTags) ? rawTags : [];
  const status = STATUS_MAP[patient?.status || ""] || STATUS_MAP.pending;

  return (
    <div className="space-y-5 p-1">
      {/* Contact Info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İletişim Bilgileri</h4>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-foreground font-medium">{patient?.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            </div>
            <span className="text-foreground">{patient?.complaint || "Şikayet belirtilmedi"}</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-foreground">{patient?.location || "—"}</span>
          </div>
        </div>
      </motion.div>

      {/* Internal Notes - ABOVE tags for doctor priority */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İç Notlar</span>
          </div>
          {savingNotes && <span className="text-[10px] text-muted-foreground animate-pulse">Kaydediliyor...</span>}
        </div>
        <textarea
          value={internalNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Sadece ekip için gizli notlar..."
          rows={3}
          className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none"
        />
      </motion.div>

      {/* Tags */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etiketler</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${TAG_COLORS[i % TAG_COLORS.length]} transition-all`}
            >
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {showTagInput ? (
            <form onSubmit={(e) => { e.preventDefault(); handleAddTag(); }} className="flex items-center gap-1">
              <Input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={() => { if (!newTag.trim()) setShowTagInput(false); }}
                placeholder="Etiket..."
                className="h-7 w-24 text-[11px] px-2 py-0 rounded-full border-primary/30"
              />
            </form>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              Ekle
            </button>
          )}
        </div>
      </motion.div>

      {/* Financial Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2.5"
      >
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Finansal Durum</h4>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Toplam</span>
            </div>
            <p className="text-lg font-bold font-display text-foreground">₺{MOCK_FINANCE.totalSpent.toLocaleString("tr-TR")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-warning" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">Bekleyen</span>
            </div>
            <p className="text-lg font-bold font-display text-warning">₺{MOCK_FINANCE.pendingPayment.toLocaleString("tr-TR")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
