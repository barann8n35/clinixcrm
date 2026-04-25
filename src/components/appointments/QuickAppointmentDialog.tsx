import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PatientSearch from "./PatientSearch";

interface QuickAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  onCreated: () => void;
}

const DEFAULT_DOCTOR = "Dr. İlhan Elmacı";

const timeSlots = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

const QuickAppointmentDialog = ({ open, onOpenChange, date: initialDate, time: initialTime, onCreated }: QuickAppointmentDialogProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctor, setDoctor] = useState(DEFAULT_DOCTOR);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState("Muayene");

  const resetForm = () => {
    setPatientName("");
    setPhone("");
    setDoctor(DEFAULT_DOCTOR);
    setSelectedPatientId(null);
    setDate(initialDate);
    setTime(initialTime);
    setType("Muayene");
  };

  const handlePatientSelect = (patient: any) => {
    setSelectedPatientId(patient.id);
    setPhone(patient.phone || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Hasta adını girin.");
      return;
    }
    setSaving(true);
    try {
      let patientId = selectedPatientId;
      if (!patientId) {
        patientId = `patient_${Date.now()}`;
        const { error: pErr } = await supabase.from("patients").insert({
          id: patientId,
          name: patientName.trim(),
          phone: phone.trim() || null,
          status: "pending",
          user_id: user?.id,
        });
        if (pErr) throw pErr;
      }

      const [h, m] = time.split(":");
      const scheduledAt = new Date(date);
      scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0);

      const { error: aErr } = await supabase.from("appointments").insert({
        patient_id: patientId,
        doctor: doctor.trim(),
        type,
        scheduled_at: scheduledAt.toISOString(),
        status: "upcoming",
        user_id: user?.id,
      });
      if (aErr) throw aErr;

      toast.success("Randevu oluşturuldu!");
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = format(date, "d MMMM yyyy, EEEE", { locale: tr });

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      {/* Date & Time row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tarih</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal transition-all duration-200 hover:border-primary/50",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "d MMM", { locale: tr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label>Saat</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Hasta *</Label>
        <PatientSearch value={patientName} onChange={setPatientName} onSelect={handlePatientSelect} />
      </div>
      <div className="space-y-1.5">
        <Label>Telefon</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" className="transition-all duration-200 focus:shadow-sm" />
      </div>
      <div className="space-y-1.5">
        <Label>Randevu Türü</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ön Muayene">Ön Muayene</SelectItem>
            <SelectItem value="Muayene">Muayene</SelectItem>
            <SelectItem value="Kontrol">Kontrol</SelectItem>
            <SelectItem value="Operasyon">Operasyon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Doktor</Label>
        <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} className="transition-all duration-200 focus:shadow-sm" />
      </div>
      <Button type="submit" className="w-full transition-all duration-200 active:scale-[0.98]" disabled={saving}>
        {saving ? "Kaydediliyor..." : "Hızlı Randevu Oluştur"}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Hızlı Randevu</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl shadow-elevated">
        <DialogHeader>
          <DialogTitle>Hızlı Randevu</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default QuickAppointmentDialog;
