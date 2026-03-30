import { useEffect, useState } from "react";
import { Phone, MapPin, AlertCircle, CheckCircle, XCircle, Clock, CalendarDays } from "lucide-react";
import { MiniSchedule } from "./MiniSchedule";
import { RescheduleDrawer } from "./RescheduleDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
}

export function PatientPanel({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [acting, setActing] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status")
        .eq("id", patientId)
        .single();
      setPatient(data);
    }
    load();
  }, [patientId]);

  async function handleAction(newStatus: "approved" | "cancelled" | "rescheduled") {
    if (acting) return;
    setActing(true);
    try {
      // Update patient status
      const { error } = await supabase
        .from("patients")
        .update({ status: newStatus })
        .eq("id", patientId);

      if (error) throw error;

      // Also update appointment if one exists
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
        newStatus === "approved"
          ? "Randevunuz başarıyla onaylanmıştır ✅"
          : newStatus === "cancelled"
          ? "Randevunuz iptal edilmiştir ❌"
          : "Randevunuzu yeniden planlamak için hangi gün ve saat sizin için uygun olur? 🗓️";

      await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text: msgText,
        platform: null,
      });

      // Update local state
      setPatient(prev => prev ? { ...prev, status: newStatus } : null);

      const successMsg = 
        newStatus === "approved"
          ? "Randevu Onaylandı ✅"
          : newStatus === "cancelled"
          ? "Randevu İptal Edildi"
          : "Yeniden planlama talebi gönderildi";
      
      toast.success(successMsg);
    } catch (e) {
      toast.error("İşlem başarısız oldu");
    } finally {
      setActing(false);
    }
  }

  const initials = patient?.name?.split(" ").map(n => n[0]).join("") || "?";

  return (
    <div className="flex flex-col h-full bg-card w-72 shrink-0 border-l border-border overflow-y-auto scrollbar-thin">
      {/* Patient Card */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/12 flex items-center justify-center">
            <span className="text-primary font-display font-bold text-base">{initials}</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-[15px] text-foreground">{patient?.name || "Loading..."}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full mt-0.5">
              <Clock className="w-3 h-3" />
              {patient?.status || "..."}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{patient?.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">Complaint: {patient?.complaint || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{patient?.location || "—"}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-3 font-mono">Event ID: #{patientId.substring(0, 8)}</p>
      </div>

      {/* Quick Actions */}
      <div className="p-5 border-b border-border">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button
            disabled={acting}
            onClick={() => handleAction("approved")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-[13px] hover:bg-success/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Approve Appointment
          </button>
          <button
            disabled={acting}
            onClick={() => handleAction("cancelled")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-[13px] hover:bg-destructive/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Cancel Appointment
          </button>
          <button
            disabled={acting}
            onClick={() => setShowReschedule(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-warning-foreground font-medium text-[13px] hover:bg-warning/90 transition-all shadow-card hover:shadow-elevated disabled:opacity-50"
          >
            <CalendarDays className="w-4 h-4" />
            Reschedule
          </button>
          <RescheduleDrawer
            open={showReschedule}
            onOpenChange={setShowReschedule}
            patientId={patientId}
            patientName={patient?.name || ""}
            onSuccess={() => setPatient(prev => prev ? { ...prev, status: "rescheduled" } : null)}
          />
        </div>
      </div>

      {/* Mini Schedule */}
      <div className="p-5 flex-1">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Schedule</h4>
        <MiniSchedule />
      </div>
    </div>
  );
}
