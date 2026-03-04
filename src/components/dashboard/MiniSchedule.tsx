import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Appointment {
  id: string;
  patient_name: string;
  doctor: string;
  type: string;
  scheduled_at: string;
  status: string;
}

const statusStyles: Record<string, { dot: string; text: string }> = {
  completed: { dot: "bg-success/40", text: "text-muted-foreground line-through" },
  "in-progress": { dot: "bg-primary animate-pulse-soft", text: "text-foreground font-medium" },
  pending: { dot: "bg-warning", text: "text-foreground font-medium" },
  upcoming: { dot: "bg-muted-foreground/30", text: "text-muted-foreground" },
};

export function MiniSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data } = await supabase
        .from("appointments")
        .select("id, doctor, type, scheduled_at, status, patients(name)")
        .gte("scheduled_at", startOfDay)
        .lt("scheduled_at", endOfDay)
        .order("scheduled_at", { ascending: true });

      if (data) {
        setAppointments(
          data.map((a: any) => ({
            id: a.id,
            patient_name: a.patients?.name || "Unknown",
            doctor: a.doctor,
            type: a.type,
            scheduled_at: a.scheduled_at,
            status: a.status,
          }))
        );
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-1">
      {appointments.map((apt, i) => {
        const s = statusStyles[apt.status] || statusStyles.upcoming;
        const time = format(new Date(apt.scheduled_at), "HH:mm");
        return (
          <div
            key={apt.id}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors
              ${apt.status === "pending" ? "bg-warning/5 border border-warning/15" : "hover:bg-accent"}`}
          >
            <div className="flex flex-col items-center pt-1">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              {i < appointments.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-[12px] ${s.text}`}>{apt.patient_name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{apt.doctor} · {apt.type}</p>
            </div>
          </div>
        );
      })}
      {appointments.length === 0 && (
        <p className="text-[12px] text-muted-foreground text-center py-4">No appointments today</p>
      )}
    </div>
  );
}
