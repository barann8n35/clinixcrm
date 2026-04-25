import { useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, CalendarDays, Link2, Check, Copy, Video } from "lucide-react";
import { MiniSchedule } from "./MiniSchedule";
import { RescheduleDrawer } from "./RescheduleDrawer";
import { SendVideoDialog } from "@/components/video/SendVideoDialog";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PatientOverviewTab } from "./patient-card/PatientOverviewTab";
import { PatientTimelineTab } from "./patient-card/PatientTimelineTab";
import { PatientFilesTab } from "./patient-card/PatientFilesTab";
import { PatientTasksTab } from "./patient-card/PatientTasksTab";
import { motion, AnimatePresence } from "framer-motion";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
  tags: string[] | null;
  internal_notes: string | null;
  reminder_active?: boolean;
  reminder_date?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "Beklemede", color: "bg-warning/10 text-warning" },
  approved: { label: "Onaylandı", color: "bg-success/10 text-success" },
  cancelled: { label: "İptal", color: "bg-destructive/10 text-destructive" },
  rescheduled: { label: "Yeniden Planlandı", color: "bg-primary/10 text-primary" },
};

export function PatientPanel({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [acting, setActing] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showSendVideo, setShowSendVideo] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { isPremium } = useRole();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status, tags, internal_notes, reminder_active, reminder_date")
        .eq("id", patientId)
        .single();
      setPatient(data as Patient | null);
    }
    load();
  }, [patientId]);

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
        newStatus === "approved" ? "Randevunuz başarıyla onaylanmıştır ✅"
        : newStatus === "cancelled" ? "Randevunuz iptal edilmiştir ❌"
        : "Randevunuzu yeniden planlamak için hangi gün ve saat sizin için uygun olur? 🗓️";

      await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text: msgText,
        platform: null,
        user_id: user?.id,
      });

      setPatient(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(
        newStatus === "approved" ? "Randevu Onaylandı ✅"
        : newStatus === "cancelled" ? "Randevu İptal Edildi"
        : "Yeniden planlama talebi gönderildi"
      );
    } catch {
      toast.error("İşlem başarısız oldu");
    } finally {
      setActing(false);
    }
  }

  function handleGenerateIntakeLink() {
    const fakeLink = `https://clinix.app/intake/${patientId.substring(0, 8)}`;
    navigator.clipboard.writeText(fakeLink).then(() => {
      setLinkCopied(true);
      toast.success("Ön kayıt linki panoya kopyalandı!");
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      toast.error("Kopyalama başarısız");
    });
  }

  const initials = patient?.name?.split(" ").map(n => n[0]).join("") || "?";
  const statusInfo = STATUS_BADGE[patient?.status || ""] || STATUS_BADGE.pending;

  return (
    <div className="flex flex-col h-full bg-background w-80 shrink-0 border-l border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-card">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <span className="text-primary font-display font-bold text-base">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-[15px] text-foreground truncate">{patient?.name || "Yükleniyor..."}</h3>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mt-1 ${statusInfo.color}`}>
              <Clock className="w-3 h-3" />
              {statusInfo.label}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-2.5 font-mono">ID: #{patientId.substring(0, 8)}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 pt-3 bg-card border-b border-border">
          <TabsList className="w-full bg-muted/50 rounded-xl h-9">
            <TabsTrigger value="overview" className="flex-1 text-[10px] font-semibold rounded-lg data-[state=active]:shadow-sm">
              Genel
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 text-[10px] font-semibold rounded-lg data-[state=active]:shadow-sm">
              Zaman Çizgisi
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 text-[10px] font-semibold rounded-lg data-[state=active]:shadow-sm">
              Görevler
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1 text-[10px] font-semibold rounded-lg data-[state=active]:shadow-sm">
              Dosyalar
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <TabsContent value="overview" className="p-4 mt-0">
            <PatientOverviewTab
              patient={patient}
              patientId={patientId}
              onPatientUpdate={setPatient}
            />
          </TabsContent>

          <TabsContent value="timeline" className="p-4 mt-0">
            <PatientTimelineTab patientId={patientId} />
          </TabsContent>

          <TabsContent value="tasks" className="p-4 mt-0">
            <PatientTasksTab />
          </TabsContent>

          <TabsContent value="files" className="p-4 mt-0">
            <PatientFilesTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border bg-card space-y-2">
        <button
          disabled={acting}
          onClick={() => handleAction("approved")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-[12px] hover:bg-success/90 transition-all disabled:opacity-50"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Randevuyu Onayla
        </button>
        <div className="flex gap-2">
          <button
            disabled={acting}
            onClick={() => handleAction("cancelled")}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive font-medium text-[11px] hover:bg-destructive/20 transition-all disabled:opacity-50 border border-destructive/20"
          >
            <XCircle className="w-3.5 h-3.5" />
            İptal
          </button>
          <button
            disabled={acting}
            onClick={() => setShowReschedule(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-warning/10 text-warning font-medium text-[11px] hover:bg-warning/20 transition-all disabled:opacity-50 border border-warning/20"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Yeniden Planla
          </button>
        </div>

        {/* Intake Link Button */}
        <motion.button
          onClick={handleGenerateIntakeLink}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-[12px] shadow-card hover:shadow-elevated transition-all duration-300 border border-primary/20"
        >
          <AnimatePresence mode="wait">
            {linkCopied ? (
              <motion.span
                key="copied"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Kopyalandı!
              </motion.span>
            ) : (
              <motion.span
                key="default"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Ön Kayıt Linki Oluştur
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {isPremium && (
          <motion.button
            onClick={() => setShowSendVideo(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card text-foreground font-semibold text-[12px] border border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
          >
            <Video className="w-4 h-4 text-primary" />
            Hastaya Video Gönder
          </motion.button>
        )}

        <RescheduleDrawer
          open={showReschedule}
          onOpenChange={setShowReschedule}
          patientId={patientId}
          patientName={patient?.name || ""}
          onSuccess={() => setPatient(prev => prev ? { ...prev, status: "rescheduled" } : null)}
        />

        <SendVideoDialog
          open={showSendVideo}
          onOpenChange={setShowSendVideo}
          patientId={patientId}
          patientName={patient?.name || ""}
        />
      </div>
    </div>
  );
}
