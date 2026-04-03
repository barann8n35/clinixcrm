import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

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
      const { data } = await supabase
        .from("appointments")
        .select("id, doctor, type, scheduled_at, status, patients(name)")
        .order("scheduled_at", { ascending: true });

      if (data) {
        setEvents(
          data.map((a: any) => {
            const colors = statusColors[a.status] || statusColors.upcoming;
            return {
              id: a.id,
              title: a.patients?.name || "—",
              start: a.scheduled_at,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              textColor: colors.text,
              extendedProps: {
                doctor: a.doctor,
                type: a.type,
                status: a.status,
              },
            };
          })
        );
      }
    }
    load();
  }, []);

  return (
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
          eventContent={(arg) => (
            <div className="px-1.5 py-0.5 text-[11px] font-medium truncate">
              <span>{arg.timeText} </span>
              <span className="font-semibold">{arg.event.title}</span>
            </div>
          )}
        />
      </motion.div>
    </div>
  );
};

export default CalendarPage;
