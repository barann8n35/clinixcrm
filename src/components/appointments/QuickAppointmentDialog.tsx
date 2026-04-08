import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
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
import PatientSearch from "./PatientSearch";

interface QuickAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  onCreated: () => void;
}

const DEFAULT_DOCTOR = "Dr. Mehmet";

const QuickAppointmentDialog = ({ open, onOpenChange, date, time, onCreated }: QuickAppointmentDialogProps) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctor, setDoctor] = useState(DEFAULT_DOCTOR);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const resetForm = () => {
    setPatientName("");
    setPhone("");
    setDoctor(DEFAULT_DOCTOR);
    setSelectedPatientId(null);
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
        });
        if (pErr) throw pErr;
      }

      const [h, m] = time.split(":");
      const scheduledAt = new Date(date);
      scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0);

      const { error: aErr } = await supabase.from("appointments").insert({
        patient_id: patientId,
        doctor: doctor.trim(),
        type: "Consultation",
        scheduled_at: scheduledAt.toISOString(),
        status: "upcoming",
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
      <div className="text-center text-sm font-medium text-primary bg-primary/10 rounded-lg py-2">
        {dateLabel} — {time}
      </div>
      <div className="space-y-1.5">
        <Label>Hasta *</Label>
        <PatientSearch value={patientName} onChange={setPatientName} onSelect={handlePatientSelect} />
      </div>
      <div className="space-y-1.5">
        <Label>Telefon</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" />
      </div>
      <div className="space-y-1.5">
        <Label>Doktor</Label>
        <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Hızlı Randevu</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default QuickAppointmentDialog;
