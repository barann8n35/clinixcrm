import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIME_SLOTS = Array.from({ length: 4 * 14 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 15; // Start from 08:00
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}); // 08:00 to 21:45

interface RescheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
}

export function RescheduleDrawer({ open, onOpenChange, patientId, patientName, onSuccess }: RescheduleDrawerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selectedDate || !selectedTime) return;
    setSaving(true);

    try {
      const [h, m] = selectedTime.split(":").map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      const iso = dt.toISOString();

      // Update patient record
      const { error: patientError } = await supabase
        .from("patients")
        .update({ status: "rescheduled", appointment_date: iso })
        .eq("id", patientId);

      if (patientError) throw patientError;

      // Update appointment if exists
      const { data: apt } = await supabase
        .from("appointments")
        .select("id")
        .eq("patient_id", patientId)
        .in("status", ["pending", "upcoming", "rescheduled"])
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (apt) {
        await supabase
          .from("appointments")
          .update({ status: "rescheduled", scheduled_at: iso })
          .eq("id", apt.id);
      }

      // Send notification message
      await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text: `Randevunuz ${format(dt, "dd MMMM yyyy, HH:mm", { locale: tr })} tarihine yeniden planlanmıştır 🗓️`,
        platform: null,
      });

      toast.success("Randevu başarıyla güncellendi 🗓️");
      onOpenChange(false);
      setSelectedDate(undefined);
      setSelectedTime(null);
      onSuccess?.();
    } catch {
      toast.error("Randevu güncellenirken bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-display">
            <CalendarDays className="w-5 h-5 text-primary" />
            Randevuyu Yeniden Planla
          </SheetTitle>
          <SheetDescription className="text-sm">
            <span className="font-semibold text-foreground">{patientName}</span> için yeni tarih ve saat seçin.
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Tarih Seçin
            </label>
            <div className="rounded-xl border border-border bg-card p-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            {selectedDate && (
              <p className="mt-2 text-sm text-primary font-medium flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(selectedDate, "dd MMMM yyyy, EEEE", { locale: tr })}
              </p>
            )}
          </div>

          {/* Time Picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Saat Seçin (15 dk aralık)
            </label>
            <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto rounded-xl border border-border bg-card p-3 scrollbar-thin">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-sm font-medium transition-all",
                    selectedTime === time
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
            {selectedTime && (
              <p className="mt-2 text-sm text-primary font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Seçilen saat: {selectedTime}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 pt-4 border-t border-border bg-card">
          {selectedDate && selectedTime && (
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium text-foreground">
                📅 {format(selectedDate, "dd MMMM yyyy", { locale: tr })}, saat {selectedTime}
              </p>
            </div>
          )}
          <Button
            className="w-full h-11 text-sm font-semibold"
            disabled={!selectedDate || !selectedTime || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              "Randevuyu Güncelle"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
