import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, CalendarCheck, FileText, CheckCircle, Bot, Phone, Stethoscope, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "ai" | "appointment" | "report" | "call" | "exam" | "completed";
}

const TYPE_CONFIG: Record<TimelineEvent["type"], { icon: typeof Bot; color: string; bg: string }> = {
  ai: { icon: Bot, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  appointment: { icon: CalendarCheck, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  report: { icon: FileText, color: "text-accent-foreground", bg: "bg-accent border-border" },
  call: { icon: Phone, color: "text-success", bg: "bg-success/10 border-success/20" },
  exam: { icon: Stethoscope, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  completed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/20" },
};

interface PatientTimelineTabProps {
  patientId: string;
}

export function PatientTimelineTab({ patientId }: PatientTimelineTabProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Build timeline from messages and appointments
      const [msgsRes, aptsRes] = await Promise.all([
        supabase.from("messages").select("id, text, sender_type, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("appointments").select("id, type, status, scheduled_at, doctor").eq("patient_id", patientId).order("scheduled_at", { ascending: false }).limit(10),
      ]);

      const timeline: TimelineEvent[] = [];

      (aptsRes.data || []).forEach((a: any) => {
        const isCompleted = a.status === "completed";
        timeline.push({
          id: a.id,
          date: a.scheduled_at,
          title: isCompleted ? "Randevu Tamamlandı" : `Randevu: ${a.type}`,
          description: `Dr. ${a.doctor} — ${a.type}`,
          type: isCompleted ? "completed" : "appointment",
        });
      });

      (msgsRes.data || []).forEach((m: any) => {
        timeline.push({
          id: m.id,
          date: m.created_at,
          title: m.sender_type === "ai" ? "AI Yanıtı" : m.sender_type === "patient" ? "Hasta Mesajı" : "Asistan Mesajı",
          description: m.text.substring(0, 100) + (m.text.length > 100 ? "..." : ""),
          type: m.sender_type === "ai" ? "ai" : "call",
        });
      });

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(timeline);
      setLoading(false);
    }
    load();
  }, [patientId]);

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Yükleniyor...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
          <Inbox className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Henüz zaman çizelgesi kaydı yok</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Mesajlar ve randevular burada görünecek</p>
      </div>
    );
  }

  return (
    <div className="p-1">
      <div className="relative">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
        <div className="space-y-0">
          {events.map((event, index) => {
            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.call;
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07, duration: 0.3 }}
                className="relative flex gap-3.5 pb-6 last:pb-0"
              >
                <div className={`relative z-10 w-10 h-10 rounded-xl border ${config.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-[13px] font-semibold text-foreground">{event.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-1">{event.description}</p>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">
                    {new Date(event.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
