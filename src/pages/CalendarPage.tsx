import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    doctor: string;
    type: string;
    status: string;
    complaint: string;
    patientName: string;
  };
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  upcoming: { bg: "hsl(var(--primary))", border: "hsl(var(--primary))", text: "#fff" },
  approved: { bg: "hsl(var(--success))", border: "hsl(var(--success))", text: "#fff" },
  cancelled: { bg: "hsl(var(--destructive))", border: "hsl(var(--destructive))", text: "#fff" },
  rescheduled: { bg: "hsl(var(--warning))", border: "hsl(var(--warning))", text: "#fff" },
  completed: { bg: "hsl(var(--muted-foreground))", border: "hsl(var(--muted-foreground))", text: "#fff" },
  pending: { bg: "hsl(var(--primary))", border: "hsl(var(--primary))", text: "#fff" },
};

const CalendarPage = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    async function load() {
      // Load from appointments table (joined with patients)
      const { data: apptData } = await supabase
        .from("appointments")
        .select("id, doctor, type, scheduled_at, status, patient_id")
        .order("scheduled_at", { ascending: true });

      // Also load patients with appointment_date for broader coverage
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, name, complaint, appointment_date, status")
        .not("appointment_date", "is", null);

      const patientMap: Record<string, { name: string; complaint: string | null }> = {};
      (patientData || []).forEach((p: any) => {
        patientMap[p.id] = { name: p.name, complaint: p.complaint };
      });

      const eventsArr: CalendarEvent[] = [];

      // Events from appointments table
      (apptData || []).forEach((a: any) => {
        const patient = patientMap[a.patient_id];
        const colors = statusColors[a.status] || statusColors.upcoming;
        eventsArr.push({
          id: a.id,
          title: patient?.name || "—",
          start: a.scheduled_at,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            doctor: a.doctor,
            type: a.type,
            status: a.status,
            complaint: patient?.complaint || "—",
            patientName: patient?.name || "—",
          },
        });
      });

      // Events from patients.appointment_date (if not already covered)
      const coveredPatientIds = new Set((apptData || []).map((a: any) => a.patient_id));
      (patientData || []).forEach((p: any) => {
        if (coveredPatientIds.has(p.id)) return;
        const colors = statusColors[p.status] || statusColors.pending;
        eventsArr.push({
          id: `patient-${p.id}`,
          title: p.name,
          start: p.appointment_date,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            doctor: "—",
            type: "Genel",
            status: p.status,
            complaint: p.complaint || "—",
            patientName: p.name,
          },
        });
      });

      setEvents(eventsArr);
    }
    load();
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
            {t("sidebar.calendar", "Takvim")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Randevuları ay, hafta ve gün bazında görüntüleyin
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border/60 bg-card shadow-card p-4 md:p-6 clinix-calendar"
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            locale="tr"
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            nowIndicator
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            buttonText={{
              today: "Bugün",
              month: "Ay",
              week: "Hafta",
              day: "Gün",
            }}
            eventContent={(arg) => {
              const ext = arg.event.extendedProps;
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="px-1.5 py-0.5 text-[11px] font-medium truncate cursor-pointer">
                      <span>{arg.timeText} </span>
                      <span className="font-semibold">{arg.event.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] p-3 space-y-1 rounded-xl">
                    <p className="text-xs font-bold">{ext.patientName}</p>
                    <p className="text-[11px] text-muted-foreground">Şikayet: {ext.complaint}</p>
                    <p className="text-[11px] text-muted-foreground">Doktor: {ext.doctor}</p>
                    <p className="text-[11px] text-muted-foreground">Tür: {ext.type}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }}
          />
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

export default CalendarPage;
