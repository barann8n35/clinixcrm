import { Phone, MapPin, AlertCircle, Clock, Tag, X, Plus, StickyNote, DollarSign, CreditCard, TrendingUp, Bell, CalendarIcon, Inbox } from "lucide-react";
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
  const [internalNotes, setInternalNotes] = useState(patient?.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [remindMe, setRemindMe] = useState(patient?.reminder_active ?? false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    patient?.reminder_date ? new Date(patient.reminder_date) : undefined
  );
  const [reminderTime, setReminderTime] = useState("09:00");
  const [savingReminder, setSavingReminder] = useState(false);

  const prevPatientId = useRef(patientId);
  if (prevPatientId.current !== patientId) {
    prevPatientId.current = patientId;
    setRemindMe(patient?.reminder_active ?? false);
    setReminderDate(patient?.reminder_date ? new Date(patient.reminder_date) : undefined);
    setInternalNotes(patient?.internal_notes || "");
  }

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

  async function handleToggleReminder(checked: boolean) {
    setRemindMe(checked);
    const { error } = await supabase.from("patients").update({
      reminder_active: checked,
      ...(!checked ? { reminder_date: null } : {}),
    }).eq("id", patientId);
    if (error) { toast.error("Güncellenemedi"); setRemindMe(!checked); return; }
    if (!checked) {
      setReminderDate(undefined);
      onPatientUpdate(prev => prev ? { ...prev, reminder_active: false, reminder_date: null } : null);
    } else {
      onPatientUpdate(prev => prev ? { ...prev, reminder_active: true } : null);
    }
  }

  async function handleSelectReminderDate(date: Date | undefined) {
    setReminderDate(date);
    if (!date) return;
    const [h, m] = reminderTime.split(":").map(Number);
    const remindAt = new Date(date);
    remindAt.setHours(h, m, 0, 0);
    setSavingReminder(true);
    const { error } = await supabase.from("patients").update({
      reminder_date: remindAt.toISOString(),
    }).eq("id", patientId);
    setSavingReminder(false);
    if (error) { toast.error("Tarih kaydedilemedi"); return; }
    onPatientUpdate(prev => prev ? { ...prev, reminder_date: remindAt.toISOString() } : null);
    toast.success("🔔 Hatırlatıcı tarihi kaydedildi!");
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

      {/* Internal Notes */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İç Notlar</span>
          </div>
          {savingNotes && <span className="text-[10px] text-muted-foreground animate-pulse">Kaydediliyor...</span>}
        </div>
        <textarea value={internalNotes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Sadece ekip için gizli notlar..." rows={3}
          className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Bell className="w-3.5 h-3.5 text-warning" />
              <span className="text-[12px] font-medium text-foreground">Bana Hatırlat 🔔</span>
            </label>
            <Switch checked={remindMe} onCheckedChange={handleToggleReminder} />
          </div>
          <AnimatePresence>
            {remindMe && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                <div className="mt-2 flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("flex-1 justify-start text-left text-[11px] h-9 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors", !reminderDate && "text-muted-foreground")}>
                        <CalendarIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                        {reminderDate ? format(reminderDate, "d MMM yyyy", { locale: tr }) : "Tarih seç..."}
                        {savingReminder && <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">💾</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={reminderDate} onSelect={handleSelectReminderDate} className={cn("p-3 pointer-events-auto")} disabled={(date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; }} />
                    </PopoverContent>
                  </Popover>
                  <div className="relative w-[88px]">
                    <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full h-9 text-[11px] rounded-xl border border-primary/20 bg-primary/5 px-2.5 text-foreground cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
