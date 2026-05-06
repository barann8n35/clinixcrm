import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Pazartesi" },
  { key: "tue", label: "Salı" },
  { key: "wed", label: "Çarşamba" },
  { key: "thu", label: "Perşembe" },
  { key: "fri", label: "Cuma" },
  { key: "sat", label: "Cumartesi" },
  { key: "sun", label: "Pazar" },
];

type DayConfig = { start: string; end: string } | null;
type WorkingHours = Record<string, DayConfig>;

const DEFAULT_HOURS: WorkingHours = {
  mon: { start: "09:00", end: "18:00" },
  tue: { start: "09:00", end: "18:00" },
  wed: { start: "09:00", end: "18:00" },
  thu: { start: "09:00", end: "18:00" },
  fri: { start: "09:00", end: "18:00" },
  sat: { start: "10:00", end: "14:00" },
  sun: null,
};

export default function ClinicScheduleTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [slotMin, setSlotMin] = useState(30);
  const [bufferMin, setBufferMin] = useState(0);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clinic_schedule")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setScheduleId(data.id);
        setHours((data.working_hours as WorkingHours) || DEFAULT_HOURS);
        setSlotMin(data.slot_duration_minutes ?? 30);
        setBufferMin(data.buffer_minutes ?? 0);
      }
      setLoading(false);
    })();
  }, [user]);

  function toggleDay(key: string, enabled: boolean) {
    setHours((h) => ({ ...h, [key]: enabled ? { start: "09:00", end: "18:00" } : null }));
  }
  function setTime(key: string, field: "start" | "end", value: string) {
    setHours((h) => ({ ...h, [key]: { ...(h[key] || { start: "09:00", end: "18:00" }), [field]: value } }));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      working_hours: hours as any,
      slot_duration_minutes: slotMin,
      buffer_minutes: bufferMin,
    };
    const { error } = scheduleId
      ? await supabase.from("clinic_schedule").update(payload).eq("id", scheduleId)
      : await supabase.from("clinic_schedule").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kaydedildi", description: "Çalışma saatleri güncellendi." });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/60 shadow-card rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Çalışma Saatleri & Randevu Slotları
        </CardTitle>
        <CardDescription>
          Klinik çalışma günlerinizi ve randevu süreçlerini buradan yönetin. Takvimde ve müsait saat önerilerinde bu ayarlar kullanılır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Slot Süresi (dakika)</Label>
            <Input
              type="number"
              min={5}
              max={240}
              value={slotMin}
              onChange={(e) => setSlotMin(Math.max(5, parseInt(e.target.value || "30")))}
            />
          </div>
          <div className="space-y-2">
            <Label>Slotlar Arası Boşluk (dakika)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              value={bufferMin}
              onChange={(e) => setBufferMin(Math.max(0, parseInt(e.target.value || "0")))}
            />
          </div>
        </div>

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const cfg = hours[key];
            const enabled = !!cfg;
            return (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="w-28 text-sm font-medium">{label}</div>
                <Switch checked={enabled} onCheckedChange={(v) => toggleDay(key, v)} />
                {enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={cfg!.start}
                      onChange={(e) => setTime(key, "start", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-xs">→</span>
                    <Input
                      type="time"
                      value={cfg!.end}
                      onChange={(e) => setTime(key, "end", e.target.value)}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Kapalı</span>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}
