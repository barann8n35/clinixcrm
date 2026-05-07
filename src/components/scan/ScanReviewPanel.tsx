import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, CalendarPlus, Bell, FileText, Save, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface ScanResult {
  patient?: { name?: string; surname?: string; phone?: string; age?: string; gender?: string; complaint?: string };
  appointment?: { date_iso?: string; doctor?: string; type?: string };
  reminders?: { remind_at_iso?: string; note: string }[];
  notes?: string;
  raw_text?: string;
  confidence?: "high" | "medium" | "low";
}

interface Props {
  result: ScanResult;
  onReset: () => void;
}

const confLabel = { high: "Yüksek güven ✓", medium: "Orta güven", low: "Düşük güven — kontrol edin" };
const confColor = { high: "bg-emerald-500/10 text-emerald-700", medium: "bg-amber-500/10 text-amber-700", low: "bg-red-500/10 text-red-700" };

export function ScanReviewPanel({ result, onReset }: Props) {
  const { user } = useAuth();
  const [p, setP] = useState(result.patient || {});
  const [a, setA] = useState(result.appointment || {});
  const [reminders, setReminders] = useState(result.reminders || []);
  const [notes, setNotes] = useState(result.notes || "");
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function savePatient(): Promise<string | null> {
    if (!p.name) { toast.error("Hasta adı gerekli"); return null; }
    setBusy(true);
    const id = `patient_${Date.now()}`;
    const fullName = [p.name, p.surname].filter(Boolean).join(" ").trim();
    const { error } = await supabase.from("patients").insert({
      id, name: fullName, phone: p.phone || null, age: p.age || null, gender: p.gender || null,
      complaint: p.complaint || null, status: "active", platform: "manual", user_id: user!.id,
      internal_notes: notes || null,
    } as any);
    setBusy(false);
    if (error) { toast.error("Hasta kaydedilemedi: " + error.message); return null; }
    setSavedPatientId(id);
    toast.success("Hasta kaydedildi ✅");
    return id;
  }

  async function saveAppointment(patientId: string) {
    if (!a.date_iso) return;
    const { error } = await supabase.from("appointments").insert({
      patient_id: patientId, scheduled_at: a.date_iso, doctor: a.doctor || "Dr. İlhan Elmacı",
      type: a.type || "Consultation", status: "upcoming", user_id: user!.id,
    } as any);
    if (error) toast.error("Randevu eklenemedi: " + error.message);
    else toast.success("Randevu eklendi 📅");
  }

  async function saveReminders(patientId: string) {
    const valid = reminders.filter((r) => r.note && r.remind_at_iso);
    if (valid.length === 0) return;
    const { error } = await supabase.from("patient_reminders").insert(
      valid.map((r) => ({ patient_id: patientId, remind_at: r.remind_at_iso!, note: r.note, user_id: user!.id })) as any
    );
    if (error) toast.error("Hatırlatıcılar eklenemedi"); else toast.success(`${valid.length} hatırlatıcı eklendi 🔔`);
  }

  async function saveAll() {
    setBusy(true);
    const id = savedPatientId || await savePatient();
    if (!id) { setBusy(false); return; }
    if (a.date_iso) await saveAppointment(id);
    if (reminders.length > 0) await saveReminders(id);
    setBusy(false);
    toast.success("Tüm kayıtlar tamamlandı ✨");
    setTimeout(onReset, 1200);
  }

  const conf = result.confidence || "medium";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className={`rounded-xl px-3 py-2 text-[12px] font-semibold flex items-center gap-2 ${confColor[conf]}`}>
        {conf === "low" && <AlertTriangle className="w-4 h-4" />}
        {confLabel[conf]}
      </div>

      {/* Patient */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-[13px] font-bold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Hasta Bilgileri</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ad" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
          <Field label="Soyad" value={p.surname} onChange={(v) => setP({ ...p, surname: v })} />
          <Field label="Telefon" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} />
          <Field label="Yaş" value={p.age} onChange={(v) => setP({ ...p, age: v })} />
          <Field label="Cinsiyet" value={p.gender} onChange={(v) => setP({ ...p, gender: v })} />
          <Field label="Şikayet" value={p.complaint} onChange={(v) => setP({ ...p, complaint: v })} />
        </div>
      </section>

      {/* Appointment */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-[13px] font-bold flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-primary" /> Randevu (opsiyonel)</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih/Saat (ISO)" value={a.date_iso} onChange={(v) => setA({ ...a, date_iso: v })} />
          <Field label="Doktor" value={a.doctor} onChange={(v) => setA({ ...a, doctor: v })} />
          <Field label="Tip" value={a.type} onChange={(v) => setA({ ...a, type: v })} />
        </div>
      </section>

      {/* Reminders */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-[13px] font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Hatırlatıcılar</h3>
        {reminders.length === 0 && <p className="text-[12px] text-muted-foreground">Yok.</p>}
        {reminders.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
            <Field label="Tarih (ISO)" value={r.remind_at_iso} onChange={(v) => setReminders(reminders.map((x, idx) => idx === i ? { ...x, remind_at_iso: v } : x))} />
            <Field label="Not" value={r.note} onChange={(v) => setReminders(reminders.map((x, idx) => idx === i ? { ...x, note: v } : x))} />
            <Button variant="ghost" size="sm" onClick={() => setReminders(reminders.filter((_, idx) => idx !== i))}>Sil</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setReminders([...reminders, { note: "", remind_at_iso: new Date(Date.now() + 86400000).toISOString() }])}>
          + Hatırlatıcı ekle
        </Button>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-[13px] font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Serbest Not (iç not olarak kaydedilir)</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full text-[12px] bg-muted/40 border border-border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
      </section>

      {/* Raw OCR */}
      {result.raw_text && (
        <section className="rounded-2xl border border-border bg-muted/30 p-3">
          <button onClick={() => setShowRaw(!showRaw)} className="text-[12px] font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Ham OCR metni
          </button>
          {showRaw && <pre className="mt-2 text-[11px] whitespace-pre-wrap text-muted-foreground">{result.raw_text}</pre>}
        </section>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 -mx-1 px-1">
        <Button variant="outline" onClick={onReset} disabled={busy} className="flex-1">İptal / Yeni Tarama</Button>
        <Button onClick={saveAll} disabled={busy || !p.name} className="flex-1 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" />{busy ? "Kaydediliyor..." : "Tümünü Kaydet"}
        </Button>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-9 text-[12px]" />
    </div>
  );
}
