import { useEffect, useState, useRef, useCallback } from "react";
import { Phone, MapPin, AlertCircle, CheckCircle, XCircle, Clock, CalendarDays, Tag, X, Plus, StickyNote } from "lucide-react";
import { MiniSchedule } from "./MiniSchedule";
import { RescheduleDrawer } from "./RescheduleDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

export function PatientPanel({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [acting, setActing] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status, tags, internal_notes")
        .eq("id", patientId)
        .single();
      setPatient(data as Patient | null);
      setInternalNotes((data as any)?.internal_notes || "");
    }
    load();
  }, [patientId]);

  // Auto-save internal notes with debounce
  const saveNotes = useCallback(async (value: string) => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("patients")
      .update({ internal_notes: value })
      .eq("id", patientId);
    setSavingNotes(false);
    if (error) toast.error("Not kaydedilemedi");
  }, [patientId]);

  function handleNotesChange(value: string) {
    setInternalNotes(value);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => saveNotes(value), 1000);
  }

  async function handleAddTag() {
    const tag = newTag.trim();
    if (!tag || !patient) return;
    const currentTags = patient.tags || [];
    if (currentTags.includes(tag)) { setNewTag(""); return; }
    const updated = [...currentTags, tag];
    const { error } = await supabase.from("patients").update({ tags: updated }).eq("id", patientId);
    if (error) { toast.error("Etiket eklenemedi"); return; }
    setPatient(prev => prev ? { ...prev, tags: updated } : null);
    setNewTag("");
    setShowTagInput(false);
  }

  async function handleRemoveTag(tag: string) {
    if (!patient) return;
    const updated = (patient.tags || []).filter(t => t !== tag);
    const { error } = await supabase.from("patients").update({ tags: updated }).eq("id", patientId);
    if (error) { toast.error("Etiket silinemedi"); return; }
    setPatient(prev => prev ? { ...prev, tags: updated } : null);
  }

  async function handleAction(newStatus: "approved" | "cancelled" | "rescheduled") {
    if (acting) return;
    setActing(true);
    try {
      const { error } = await supabase.from("patients").update({ status: newStatus }).eq("id", patientId);
      if (error) throw error;

      const { data: apt } = await supabase
        .from("appointments")
        .select("id")
        .eq("patient_id", patientId)
        .in("status", ["pending", "upcoming", "rescheduled"])
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (apt) {
        await supabase.from("appointments").update({ status: newStatus }).eq("id", apt.id);
      }

      const msgText =
        newStatus === "approved"
          ? "Randevunuz başarıyla onaylanmıştır ✅"
          : newStatus === "cancelled"
          ? "Randevunuz iptal edilmiştir ❌"
          : "Randevunuzu yeniden planlamak için hangi gün ve saat sizin için uygun olur? 🗓️";

      await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text: msgText,
        platform: null,
      });

      setPatient(prev => prev ? { ...prev, status: newStatus } : null);
      const successMsg =
        newStatus === "approved" ? "Randevu Onaylandı ✅"
        : newStatus === "cancelled" ? "Randevu İptal Edildi"
        : "Yeniden planlama talebi gönderildi";
      toast.success(successMsg);
    } catch (e) {
      toast.error("İşlem başarısız oldu");
    } finally {
      setActing(false);
    }
  }

  const initials = patient?.name?.split(" ").map(n => n[0]).join("") || "?";
  const tags = patient?.tags || [];

  return (
    <div className="flex flex-col h-full bg-card w-72 shrink-0 border-l border-border overflow-y-auto scrollbar-thin">
      {/* Patient Card */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/12 flex items-center justify-center">
            <span className="text-primary font-display font-bold text-base">{initials}</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-[15px] text-foreground">{patient?.name || "Loading..."}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full mt-0.5">
              <Clock className="w-3 h-3" />
              {patient?.status || "..."}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Etiketler</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${TAG_COLORS[i % TAG_COLORS.length]} transition-all`}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleAddTag(); }}
                className="flex items-center gap-1"
              >
                <Input
                  autoFocus
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => { if (!newTag.trim()) setShowTagInput(false); }}
                  placeholder="Etiket..."
                  className="h-6 w-24 text-[11px] px-2 py-0 rounded-full border-primary/30"
                />
              </form>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="w-3 h-3" />
                Ekle
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{patient?.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">Complaint: {patient?.complaint || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{patient?.location || "—"}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-3 font-mono">Event ID: #{patientId.substring(0, 8)}</p>
      </div>

      {/* Internal Notes */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İç Notlar</span>
          </div>
          {savingNotes && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Kaydediliyor...</span>
          )}
        </div>
        <div className="relative">
          <textarea
            value={internalNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Sadece ekip için gizli notlar..."
            rows={3}
            className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-5 border-b border-border">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button
            disabled={acting}
            onClick={() => handleAction("approved")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-[13px] hover:bg-success/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Approve Appointment
          </button>
          <button
            disabled={acting}
            onClick={() => handleAction("cancelled")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-[13px] hover:bg-destructive/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Cancel Appointment
          </button>
          <button
            disabled={acting}
            onClick={() => setShowReschedule(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-warning-foreground font-medium text-[13px] hover:bg-warning/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <CalendarDays className="w-4 h-4" />
            Reschedule
          </button>
          <RescheduleDrawer
            open={showReschedule}
            onOpenChange={setShowReschedule}
            patientId={patientId}
            patientName={patient?.name || ""}
            onSuccess={() => setPatient(prev => prev ? { ...prev, status: "rescheduled" } : null)}
          />
        </div>
      </div>

      {/* Mini Schedule */}
      <div className="p-5 flex-1">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Schedule</h4>
        <MiniSchedule />
      </div>
    </div>
  );
}
