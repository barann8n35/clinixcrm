import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NewAppointmentDialogProps {
  onCreated: () => void;
}

const timeSlots = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

const NewAppointmentDialog = ({ onCreated }: NewAppointmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [doctor, setDoctor] = useState("");
  const [type, setType] = useState("Consultation");
  const [complaint, setComplaint] = useState("");

  const resetForm = () => {
    setPatientName("");
    setPhone("");
    setDate(undefined);
    setTime("");
    setDoctor("");
    setType("Consultation");
    setComplaint("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim() || !date || !time || !doctor.trim()) {
      toast.error("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setSaving(true);

    try {
      // Create or find patient
      const patientId = `patient_${Date.now()}`;
      const { error: patientError } = await supabase.from("patients").insert({
        id: patientId,
        name: patientName.trim(),
        phone: phone.trim() || null,
        complaint: complaint.trim() || null,
        status: "pending",
      });

      if (patientError) throw patientError;

      // Build scheduled_at
      const [h, m] = time.split(":");
      const scheduledAt = new Date(date);
      scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0);

      const { error: aptError } = await supabase.from("appointments").insert({
        patient_id: patientId,
        doctor: doctor.trim(),
        type,
        scheduled_at: scheduledAt.toISOString(),
        status: "upcoming",
      });

      if (aptError) throw aptError;

      toast.success("Randevu başarıyla oluşturuldu!");
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Randevu oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Yeni Randevu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Randevu Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Patient Name */}
           <div className="space-y-1.5">
             <Label htmlFor="patientName">Hasta Adı ve Soyadı *</Label>
             <Input
               id="patientName"
               placeholder="Hasta adını ve soyadını girin"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              maxLength={100}
            />
          </div>

           {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon Numarası</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="+90 5XX XXX XX XX"
              value={phone}
              onChange={(e) => {
                let val = e.target.value.replace(/[^\d+\s]/g, "");
                // Auto-format: +90 5XX XXX XX XX
                const digits = val.replace(/\D/g, "");
                if (digits.length > 0) {
                  let formatted = "";
                  if (digits.startsWith("90")) {
                    formatted = "+" + digits.slice(0, 2);
                    if (digits.length > 2) formatted += " " + digits.slice(2, 5);
                    if (digits.length > 5) formatted += " " + digits.slice(5, 8);
                    if (digits.length > 8) formatted += " " + digits.slice(8, 10);
                    if (digits.length > 10) formatted += " " + digits.slice(10, 12);
                  } else if (digits.startsWith("0")) {
                    formatted = digits.slice(0, 4);
                    if (digits.length > 4) formatted += " " + digits.slice(4, 7);
                    if (digits.length > 7) formatted += " " + digits.slice(7, 9);
                    if (digits.length > 9) formatted += " " + digits.slice(9, 11);
                  } else {
                    formatted = val;
                  }
                  val = formatted;
                }
                setPhone(val);
              }}
              maxLength={17}
            />
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Doktor *</Label>
            <Input
              id="doctor"
              placeholder="Doktor adını girin"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Randevu Türü</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Consultation">Konsültasyon</SelectItem>
                <SelectItem value="Follow-up">Kontrol</SelectItem>
                <SelectItem value="Surgery">Ameliyat</SelectItem>
                <SelectItem value="Lab">Laboratuvar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tarih *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d MMM yyyy", { locale: tr }) : "Seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Saat *</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Randevu Oluştur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentDialog;
