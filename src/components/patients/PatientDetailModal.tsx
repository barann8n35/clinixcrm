import { useState, useEffect, useCallback } from "react";
import { X, Edit3, Save, CalendarIcon, CheckCircle2, Phone, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { PatientOverviewTab } from "@/components/dashboard/patient-card/PatientOverviewTab";
import { PatientTimelineTab } from "@/components/dashboard/patient-card/PatientTimelineTab";
import { PatientTasksTab } from "@/components/dashboard/patient-card/PatientTasksTab";
import { PatientClinicalTab } from "@/components/dashboard/patient-card/PatientClinicalTab";

export interface PatientFull {
  id: string;
  name: string;
  surname: string | null;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
  platform: string | null;
  created_at: string;
  internal_notes: string | null;
  reminder_date: string | null;
  reminder_active: boolean;
  tags: string[] | null;
  age: string | null;
  gender: string | null;
  notes: string | null;
}

interface PatientDetailModalProps {
  patientId: string | null;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  discharged: "bg-muted text-muted-foreground border-border",
  arrived: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const timeSlots = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

export function PatientDetailModal({ patientId, onClose }: PatientDetailModalProps) {
  const isMobile = useIsMobile();
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientFull>>({});
  const [saving, setSaving] = useState(false);
  // Appointment fields for edit
  const [apptId, setApptId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState<Date | undefined>(undefined);
  const [apptTime, setApptTime] = useState("09:00");
  const [apptType, setApptType] = useState("Muayene");
  const [calling, setCalling] = useState(false);

  const handleCallPatient = async () => {
    if (!patient?.phone) {
      toast.error("Bu hastanın telefon numarası yok.");
      return;
    }
    setCalling(true);
    const { data, error } = await supabase.functions.invoke("place-outbound-call", {
      body: { patient_id: patient.id, call_type: "manual" },
    });
    setCalling(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Arama başlatılamadı");
      return;
    }
    toast.success("📞 Arama başlatıldı");
  };

  const fetchPatient = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("id, name, surname, phone, complaint, location, status, platform, created_at, internal_notes, reminder_date, reminder_active, tags, age, gender, notes")
      .eq("id", id)
      .maybeSingle();

    // Fetch latest appointment for this patient
    const { data: apptData } = await supabase
      .from("appointments")
      .select("id, scheduled_at, type")
      .eq("patient_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setPatient(data as unknown as PatientFull);
    } else {
      toast.error("Hasta bulunamadı");
      onClose();
    }

    if (apptData) {
      setApptId(apptData.id);
      const d = new Date(apptData.scheduled_at);
      setApptDate(d);
      setApptTime(format(d, "HH:mm"));
      setApptType(apptData.type || "Muayene");
    } else {
      setApptId(null);
      setApptDate(undefined);
      setApptTime("09:00");
      setApptType("Muayene");
    }

    setLoading(false);
  }, [onClose]);

  useEffect(() => {
    if (patientId) {
      fetchPatient(patientId);
      setEditing(false);
    } else {
      setPatient(null);
    }
  }, [patientId, fetchPatient]);

  const startEdit = () => {
    if (!patient) return;
    setEditForm({
      name: patient.name,
      surname: patient.surname,
      phone: patient.phone,
      complaint: patient.complaint,
      location: patient.location,
      age: patient.age,
      gender: patient.gender,
      notes: patient.notes,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      // Update patient
      const { error } = await supabase
        .from("patients")
        .update({
          name: editForm.name || patient.name,
          surname: editForm.surname ?? patient.surname,
          phone: editForm.phone ?? patient.phone,
          complaint: editForm.complaint ?? patient.complaint,
          location: editForm.location ?? patient.location,
          age: editForm.age ?? patient.age,
          gender: editForm.gender ?? patient.gender,
          notes: editForm.notes ?? patient.notes,
        })
        .eq("id", patient.id);
      if (error) throw error;

      // Update appointment if exists
      if (apptId && apptDate) {
        const [h, m] = apptTime.split(":");
        const scheduledAt = new Date(apptDate);
        scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0);

        const { error: apptError } = await supabase
          .from("appointments")
          .update({
            scheduled_at: scheduledAt.toISOString(),
            type: apptType,
          })
          .eq("id", apptId);
        if (apptError) throw apptError;
      }

      setPatient(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      toast.success("Hasta ve randevu bilgileri güncellendi ✅");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handlePatientUpdate = (updater: (prev: any) => any) => {
    setPatient(updater);
  };

  const handleMarkArrived = async () => {
    if (!patient) return;
    // Update patient status
    await supabase.from("patients").update({ status: "arrived" }).eq("id", patient.id);
    // Update latest appointment status too
    if (apptId) {
      await supabase.from("appointments").update({ status: "arrived" }).eq("id", apptId);
    }
    setPatient(prev => prev ? { ...prev, status: "arrived" } : null);
    toast.success("Hasta bekleme salonuna alındı ✅");
  };

  const isArrived = patient?.status === "arrived";
  const isOpen = !!patientId;

  const content = (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {patient?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground truncate">
              {patient?.name} {patient?.surname || ""}
            </h2>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusStyles[patient?.status || "pending"] || statusStyles.pending}`}>
              {patient?.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {patient?.phone || "Telefon yok"} · {patient?.platform || ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && !isArrived && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-all duration-200" onClick={handleMarkArrived}>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Hasta Geldi</p></TooltipContent>
            </Tooltip>
          )}
          {isArrived && !editing && (
            <div className="h-8 w-8 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
            </div>
          )}
          {!editing && patient?.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                  onClick={handleCallPatient}
                  disabled={calling}
                >
                  {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Asistan ile ara</p></TooltipContent>
            </Tooltip>
          )}
          {!editing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startEdit}>
              <Edit3 className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-pulse text-sm text-muted-foreground">Yükleniyor...</div>
        </div>
      ) : editing ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Hasta Bilgilerini Düzenle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Ad</label>
                <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Soyad</label>
                <Input value={editForm.surname || ""} onChange={e => setEditForm(f => ({ ...f, surname: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Telefon</label>
                <Input value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Yaş</label>
                <Input value={editForm.age || ""} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Cinsiyet</label>
                <Input value={editForm.gender || ""} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Konum</label>
                <Input value={editForm.location || ""} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Şikayet</label>
                <Input value={editForm.complaint || ""} onChange={e => setEditForm(f => ({ ...f, complaint: e.target.value }))} className="h-9 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Notlar</label>
                <textarea
                  value={editForm.notes || ""}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full text-sm bg-muted/40 border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            {/* Appointment Fields */}
            {apptId && (
              <>
                <div className="border-t border-border/60 pt-3 mt-1">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Randevu Bilgileri</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground">Randevu Tarihi</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal h-9 text-sm rounded-xl", !apptDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {apptDate ? format(apptDate, "d MMM yyyy", { locale: tr }) : "Seçin"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={apptDate}
                            onSelect={setApptDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground">Randevu Saati</label>
                      <Select value={apptTime} onValueChange={setApptTime}>
                        <SelectTrigger className="h-9 text-sm rounded-xl">
                          <SelectValue placeholder="Saat" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground">Randevu Türü</label>
                      <Select value={apptType} onValueChange={setApptType}>
                        <SelectTrigger className="h-9 text-sm rounded-xl">
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
                  </div>
                </div>
              </>
            )}
            <Button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-xl text-sm font-semibold">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 mb-0 shrink-0">
            <TabsTrigger value="overview" className="text-xs">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Zaman Çizelgesi</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Görevler</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="mt-0 px-3 pb-4">
              {patient && (
                <PatientOverviewTab
                  patient={patient}
                  patientId={patient.id}
                  onPatientUpdate={handlePatientUpdate}
                />
              )}
            </TabsContent>
            <TabsContent value="timeline" className="mt-0 px-3 pb-4">
              {patient && <PatientTimelineTab patientId={patient.id} />}
            </TabsContent>
            <TabsContent value="tasks" className="mt-0 px-3 pb-4">
              <PatientTasksTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[90vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] [&>button.absolute]:hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
