import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, CalendarPlus, Bell, FileText, Save, AlertTriangle, ChevronDown, ChevronUp, Trash2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface ScanEntry {
  patient?: { name?: string; surname?: string; phone?: string; age?: string; gender?: string; complaint?: string };
  appointment?: { date_iso?: string; doctor?: string; type?: string };
  reminders?: { remind_at_iso?: string; note: string }[];
  notes?: string;
  source_text?: string;
  source_image_index?: number;
  confidence?: "high" | "medium" | "low";
}

export interface ScanResult {
  entries?: ScanEntry[];
  raw_text?: string;
  // Legacy single-entry format support:
  patient?: ScanEntry["patient"];
  appointment?: ScanEntry["appointment"];
  reminders?: ScanEntry["reminders"];
  notes?: string;
  confidence?: ScanEntry["confidence"];
}

interface Props {
  result: ScanResult;
  onReset: () => void;
}

const confColor = {
  high: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  low: "bg-red-500/10 text-red-700 border-red-500/30",
};
const confLabel = { high: "Yüksek", medium: "Orta", low: "Düşük" };

function normalizeEntries(r: ScanResult): ScanEntry[] {
  if (Array.isArray(r.entries) && r.entries.length > 0) return r.entries;
  // legacy fallback
  if (r.patient || r.appointment || r.reminders || r.notes) {
    return [{ patient: r.patient, appointment: r.appointment, reminders: r.reminders, notes: r.notes, confidence: r.confidence }];
  }
  return [];
}

export function ScanReviewPanel({ result, onReset }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScanEntry[]>(() => normalizeEntries(result));
  const [selected, setSelected] = useState<Set<number>>(() => new Set(normalizeEntries(result).map((_, i) => i)));
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  function updateEntry(i: number, patch: Partial<ScanEntry>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const n = new Set<number>();
      [...prev].filter((x) => x !== i).forEach((x) => n.add(x > i ? x - 1 : x));
      return n;
    });
  }
  function toggleSelected(i: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }
  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  async function saveEntry(e: ScanEntry, idx: number): Promise<boolean> {
    const p = e.patient || {};
    if (!p.name) { toast.error(`#${idx + 1}: Hasta adı eksik, atlandı`); return false; }
    const id = `patient_${Date.now()}_${idx}`;
    const fullName = [p.name, p.surname].filter(Boolean).join(" ").trim();
    const { error: pErr } = await supabase.from("patients").insert({
      id, name: fullName, phone: p.phone || null, age: p.age || null, gender: p.gender || null,
      complaint: p.complaint || null, status: "active", platform: "manual", user_id: user!.id,
      internal_notes: e.notes || null,
    } as any);
    if (pErr) { toast.error(`#${idx + 1} kaydedilemedi: ${pErr.message}`); return false; }

    if (e.appointment?.date_iso) {
      await supabase.from("appointments").insert({
        patient_id: id, scheduled_at: e.appointment.date_iso,
        doctor: e.appointment.doctor || "Dr. İlhan Elmacı",
        type: e.appointment.type || "Consultation", status: "upcoming", user_id: user!.id,
      } as any);
    }
    const validRem = (e.reminders || []).filter((r) => r.note && r.remind_at_iso);
    if (validRem.length > 0) {
      await supabase.from("patient_reminders").insert(
        validRem.map((r) => ({ patient_id: id, remind_at: r.remind_at_iso!, note: r.note, user_id: user!.id })) as any
      );
    }
    return true;
  }

  async function saveAllSelected() {
    if (selected.size === 0) { toast.error("Hiç kayıt seçilmedi"); return; }
    setBusy(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < entries.length; i++) {
      if (!selected.has(i)) continue;
      const success = await saveEntry(entries[i], i);
      if (success) ok++; else fail++;
    }
    setBusy(false);
    if (ok > 0) toast.success(`${ok} kayıt başarıyla eklendi ✨${fail > 0 ? ` (${fail} hata)` : ""}`);
    if (ok > 0) setTimeout(onReset, 1200);
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-muted-foreground">Hiç kayıt çıkarılamadı.</p>
        <Button onClick={onReset} variant="outline">Yeni Tarama</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pb-24">
      <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-primary">
          <Users className="w-4 h-4" />
          {entries.length} kayıt bulundu — {selected.size} seçili
        </div>
        <button
          onClick={() => setSelected(selected.size === entries.length ? new Set() : new Set(entries.map((_, i) => i)))}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {selected.size === entries.length ? "Hiçbirini seçme" : "Tümünü seç"}
        </button>
      </div>

      <div className="space-y-2">
        {entries.map((e, i) => {
          const isOpen = expanded.has(i);
          const isSel = selected.has(i);
          const conf = e.confidence || "medium";
          const title = [e.patient?.name, e.patient?.surname].filter(Boolean).join(" ") || `Kayıt #${i + 1}`;
          return (
            <div key={i} className={`rounded-2xl border bg-card transition-all ${isSel ? "border-primary/40 shadow-sm" : "border-border opacity-70"}`}>
              <div className="flex items-center gap-2 p-3">
                <Checkbox checked={isSel} onCheckedChange={() => toggleSelected(i)} />
                <button onClick={() => toggleExpanded(i)} className="flex-1 flex items-center gap-2 text-left">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-[13px] font-semibold text-foreground truncate">{title}</span>
                  {e.patient?.phone && <span className="text-[11px] text-muted-foreground">{e.patient.phone}</span>}
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${confColor[conf]}`}>
                    {conf === "low" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {confLabel[conf]}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => removeEntry(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Ad" value={e.patient?.name} onChange={(v) => updateEntry(i, { patient: { ...e.patient, name: v } })} />
                        <Field label="Soyad" value={e.patient?.surname} onChange={(v) => updateEntry(i, { patient: { ...e.patient, surname: v } })} />
                        <Field label="Telefon" value={e.patient?.phone} onChange={(v) => updateEntry(i, { patient: { ...e.patient, phone: v } })} />
                        <Field label="Yaş" value={e.patient?.age} onChange={(v) => updateEntry(i, { patient: { ...e.patient, age: v } })} />
                        <Field label="Cinsiyet" value={e.patient?.gender} onChange={(v) => updateEntry(i, { patient: { ...e.patient, gender: v } })} />
                        <Field label="Şikayet" value={e.patient?.complaint} onChange={(v) => updateEntry(i, { patient: { ...e.patient, complaint: v } })} />
                      </div>

                      <div className="rounded-xl bg-muted/30 p-2 space-y-2">
                        <div className="text-[11px] font-bold flex items-center gap-1.5 text-muted-foreground"><CalendarPlus className="w-3.5 h-3.5" /> Randevu</div>
                        <div className="grid grid-cols-3 gap-2">
                          <Field label="Tarih ISO" value={e.appointment?.date_iso} onChange={(v) => updateEntry(i, { appointment: { ...e.appointment, date_iso: v } })} />
                          <Field label="Doktor" value={e.appointment?.doctor} onChange={(v) => updateEntry(i, { appointment: { ...e.appointment, doctor: v } })} />
                          <Field label="Tip" value={e.appointment?.type} onChange={(v) => updateEntry(i, { appointment: { ...e.appointment, type: v } })} />
                        </div>
                      </div>

                      {(e.reminders && e.reminders.length > 0) && (
                        <div className="rounded-xl bg-muted/30 p-2 space-y-2">
                          <div className="text-[11px] font-bold flex items-center gap-1.5 text-muted-foreground"><Bell className="w-3.5 h-3.5" /> Hatırlatıcılar</div>
                          {e.reminders.map((r, ri) => (
                            <div key={ri} className="grid grid-cols-[1fr_2fr] gap-2">
                              <Field label="Tarih" value={r.remind_at_iso} onChange={(v) => updateEntry(i, { reminders: e.reminders!.map((x, xi) => xi === ri ? { ...x, remind_at_iso: v } : x) })} />
                              <Field label="Not" value={r.note} onChange={(v) => updateEntry(i, { reminders: e.reminders!.map((x, xi) => xi === ri ? { ...x, note: v } : x) })} />
                            </div>
                          ))}
                        </div>
                      )}

                      {e.notes && (
                        <div className="rounded-xl bg-muted/30 p-2 space-y-1">
                          <div className="text-[11px] font-bold flex items-center gap-1.5 text-muted-foreground"><FileText className="w-3.5 h-3.5" /> Not</div>
                          <textarea value={e.notes} onChange={(ev) => updateEntry(i, { notes: ev.target.value })} rows={2}
                            className="w-full text-[12px] bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {result.raw_text && (
        <section className="rounded-2xl border border-border bg-muted/30 p-3">
          <button onClick={() => setShowRaw(!showRaw)} className="text-[12px] font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Ham OCR metni
          </button>
          {showRaw && <pre className="mt-2 text-[11px] whitespace-pre-wrap text-muted-foreground">{result.raw_text}</pre>}
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-auto md:relative bg-background/95 backdrop-blur border-t md:border-0 border-border p-3 md:p-0 flex gap-2 max-w-2xl md:mx-auto">
        <Button variant="outline" onClick={onReset} disabled={busy} className="flex-1">İptal</Button>
        <Button onClick={saveAllSelected} disabled={busy || selected.size === 0} className="flex-[2] bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" />{busy ? "Kaydediliyor..." : `Seçili ${selected.size} Kaydı Ekle`}
        </Button>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-[12px]" />
    </div>
  );
}
