import { Phone, MapPin, AlertCircle, Tag, X, Plus, StickyNote, CreditCard, Bell, CalendarIcon, Save, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
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
  reminder_active?: boolean;
  reminder_date?: string | null;
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

interface PatientOverviewTabProps {
  patient: Patient | null;
  patientId: string;
  onPatientUpdate: (updater: (prev: Patient | null) => Patient | null) => void;
}

export function PatientOverviewTab({ patient, patientId, onPatientUpdate }: PatientOverviewTabProps) {
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerStep, setTimePickerStep] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState("09");

  // Reset state when patientId or patient data changes
  useEffect(() => {
    setInternalNotes(patient?.internal_notes || "");
    setReminderDate(patient?.reminder_date ? new Date(patient.reminder_date) : undefined);
    if (patient?.reminder_date) {
      const d = new Date(patient.reminder_date);
      setReminderTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    } else {
      setReminderTime("09:00");
    }
    setDirty(false);
  }, [patientId, patient?.internal_notes, patient?.reminder_date]);

  function markDirty() {
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let reminderIso: string | null = null;
      if (reminderDate) {
        const [h, m] = reminderTime.split(":").map(Number);
        const dt = new Date(reminderDate);
        dt.setHours(h, m, 0, 0);
        reminderIso = dt.toISOString();
      }

      const { error } = await supabase.from("patients").update({
        internal_notes: internalNotes,
        reminder_active: !!reminderDate,
        reminder_date: reminderIso,
        reminder_sent: false,
      }).eq("id", patientId);

      if (error) throw error;

      onPatientUpdate(prev => prev ? {
        ...prev,
        internal_notes: internalNotes,
        reminder_active: !!reminderDate,
        reminder_date: reminderIso,
      } : null);

      setDirty(false);
      toast.success("Not ve hatırlatıcı kaydedildi ✅");
    } catch {
      toast.error("Kayıt başarısız oldu");
    } finally {
      setSaving(false);
    }
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

  function handleClearReminder() {
    setReminderDate(undefined);
    setReminderTime("09:00");
    markDirty();
  }

  const rawTags = patient?.tags;
  const tags: string[] = Array.isArray(rawTags) ? rawTags : [];

  return (
    <div className="space-y-5 p-1">
      {/* AI Quick Summary (Premium Glassmorphism) */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl p-4 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent shadow-[0_4px_24px_-8px_rgba(99,102,241,0.2)]">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="w-16 h-16 text-indigo-500" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h4 className="text-[12px] font-bold text-indigo-950 dark:text-indigo-200 tracking-tight">AI Hızlı Hasta Özeti</h4>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] leading-relaxed text-indigo-900/80 dark:text-indigo-200/80 font-medium">
            {patient?.complaint ? `Ana şikayeti: ${patient.complaint}.` : "Henüz belirgin bir şikayet kaydedilmemiş."}
            {patient?.status === "pending" && " Hasta şu an bekleme aşamasında, aksiyon bekliyor."}
            {patient?.status === "approved" && " Hastanın işlemleri onaylanmış durumda."}
          </p>
          <div className="bg-indigo-500/10 rounded-lg p-2.5 border border-indigo-500/10">
            <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
              ⚡ Aksiyon Önerisi:
            </p>
            <p className="text-[11px] text-indigo-900/70 dark:text-indigo-200/70 mt-0.5">
              {patient?.status === "pending" ? "Hastayla iletişime geçip randevu gününü kesinleştirin." : "Rutin takibe devam edin, geçmiş notları kontrol edin."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contact Info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İletişim Bilgileri</h4>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-3.5 h-3.5 text-primary" /></div>
            <span className="text-foreground font-medium">{patient?.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0"><AlertCircle className="w-3.5 h-3.5 text-warning" /></div>
            <span className="text-foreground">{patient?.complaint || "Şikayet belirtilmedi"}</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0"><MapPin className="w-3.5 h-3.5 text-success" /></div>
            <span className="text-foreground">{patient?.location || "—"}</span>
          </div>
        </div>
      </motion.div>

      {/* Internal Notes & Reminder */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İç Notlar & Hatırlatıcı</span>
        </div>

        <textarea
          value={internalNotes}
          onChange={(e) => { setInternalNotes(e.target.value); markDirty(); }}
          placeholder="Sadece ekip için gizli notlar..."
          rows={3}
          className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none"
        />

        {/* Reminder Date/Time Picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-warning" />
            <span className="text-[12px] font-medium text-foreground">Hatırlatıcı</span>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left text-[11px] h-9 rounded-xl border-border", !reminderDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                  {reminderDate ? format(reminderDate, "d MMM yyyy", { locale: tr }) : "Tarih seç..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={reminderDate}
                  onSelect={(date) => { setReminderDate(date); markDirty(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); }}
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; }}
                />
              </PopoverContent>
            </Popover>
            <Popover open={timePickerOpen} onOpenChange={(open) => { setTimePickerOpen(open); if (open) setTimePickerStep("hour"); }}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[88px] justify-start text-[11px] h-9 rounded-xl border-border")}>
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  {reminderTime}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                {timePickerStep === "hour" ? (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Saat Seç</p>
                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                          <button
                            key={h}
                            onClick={() => { setSelectedHour(h); setTimePickerStep("minute"); }}
                            className={cn(
                              "h-8 rounded-lg text-[12px] font-medium transition-colors",
                              selectedHour === h ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                            )}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Dakika Seç</p>
                    <div className="grid grid-cols-4 gap-1">
                      {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            const newTime = `${selectedHour}:${m}`;
                            setReminderTime(newTime);
                            markDirty();
                            setTimePickerOpen(false);
                          }}
                          className={cn(
                            "h-8 rounded-lg text-[12px] font-medium transition-colors",
                            reminderTime.split(":")[1] === m && reminderTime.split(":")[0] === selectedHour
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {reminderDate && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={handleClearReminder}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <AnimatePresence>
          {dirty && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-9 rounded-xl text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                {saving ? "Kaydediliyor..." : "Notu ve Hatırlatıcıyı Kaydet"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tags */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etiketler</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${TAG_COLORS[i % TAG_COLORS.length]} transition-all`}>
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70 transition-opacity"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {showTagInput ? (
            <form onSubmit={(e) => { e.preventDefault(); handleAddTag(); }} className="flex items-center gap-1">
              <Input autoFocus value={newTag} onChange={(e) => setNewTag(e.target.value)} onBlur={() => { if (!newTag.trim()) setShowTagInput(false); }} placeholder="Etiket..." className="h-7 w-24 text-[11px] px-2 py-0 rounded-full border-primary/30" />
            </form>
          ) : (
            <button onClick={() => setShowTagInput(true)} className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              <Plus className="w-3 h-3" />Ekle
            </button>
          )}
        </div>
      </motion.div>

      {/* Financial Summary - Empty State */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2.5">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Finansal Durum</h4>
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
            <CreditCard className="w-5 h-5 text-muted-foreground/30" />
          </div>
          <p className="text-xs text-muted-foreground">Finansal veri henüz bağlanmadı</p>
        </div>
      </motion.div>
    </div>
  );
}
