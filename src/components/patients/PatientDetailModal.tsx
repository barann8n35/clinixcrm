import { useState, useEffect, useCallback } from "react";
import { X, Edit3, Save, Phone, MapPin, AlertCircle, User, CalendarIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PatientOverviewTab } from "@/components/dashboard/patient-card/PatientOverviewTab";
import { PatientTimelineTab } from "@/components/dashboard/patient-card/PatientTimelineTab";
import { PatientTasksTab } from "@/components/dashboard/patient-card/PatientTasksTab";

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
};

export function PatientDetailModal({ patientId, onClose }: PatientDetailModalProps) {
  const isMobile = useIsMobile();
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientFull>>({});
  const [saving, setSaving] = useState(false);

  const fetchPatient = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("id, name, surname, phone, complaint, location, status, platform, created_at, internal_notes, reminder_date, reminder_active, tags, age, gender, notes")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setPatient(data as unknown as PatientFull);
    } else {
      toast.error("Hasta bulunamadı");
      onClose();
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
      setPatient(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      toast.success("Hasta bilgileri güncellendi ✅");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handlePatientUpdate = (updater: (prev: any) => any) => {
    setPatient(updater);
  };

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
