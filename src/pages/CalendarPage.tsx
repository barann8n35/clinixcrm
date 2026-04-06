import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { User, Phone, Stethoscope, FileText, Clock, X, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
    phone: string;
    scheduledAt: string;
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

const statusLabel: Record<string, string> = {
  upcoming: "Yaklaşan",
  approved: "Onaylı",
  cancelled: "İptal",
  rescheduled: "Yeniden Planlandı",
  completed: "Tamamlandı",
  pending: "Beklemede",
};

const CalendarPage = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    async function load() {
      const { data: apptData } = await supabase
        .from("appointments")
        .select("id, doctor, type, scheduled_at, status, patient_id")
        .order("scheduled_at", { ascending: true });

      const { data: patientData } = await supabase
        .from("patients")
        .select("id, name, complaint, appointment_date, status, phone")
        .not("appointment_date", "is", null);

      const patientMap: Record<string, { name: string; complaint: string | null; phone: string | null }> = {};
      (patientData || []).forEach((p: any) => {
        patientMap[p.id] = { name: p.name, complaint: p.complaint, phone: p.phone };
      });

      const eventsArr: CalendarEvent[] = [];

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
            phone: patient?.phone || "—",
            scheduledAt: a.scheduled_at,
          },
        });
      });

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
            phone: p.phone || "—",
            scheduledAt: p.appointment_date,
          },
        });
      });

      setEvents(eventsArr);
    }
    load();
  }, []);

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: {
        doctor: event.extendedProps.doctor,
        type: event.extendedProps.type,
        status: event.extendedProps.status,
        complaint: event.extendedProps.complaint,
        patientName: event.extendedProps.patientName,
        phone: event.extendedProps.phone,
        scheduledAt: event.extendedProps.scheduledAt,
      },
    });
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return format(d, "d MMMM yyyy, HH:mm", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
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
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            allDaySlot={false}
            expandRows
            buttonText={{
              today: "Bugün",
              month: "Ay",
              week: "Hafta",
              day: "Gün",
            }}
            eventClick={handleEventClick}
            eventContent={(arg) => {
              return (
                <div className="px-1.5 py-0.5 text-[11px] font-medium truncate cursor-pointer">
                  <span>{arg.timeText} </span>
                  <span className="font-semibold">{arg.event.title}</span>
                </div>
              );
            }}
          />
        </motion.div>
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Randevu Detayı
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-2">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: selectedEvent.backgroundColor,
                    color: selectedEvent.textColor,
                    borderColor: selectedEvent.borderColor,
                  }}
                >
                  {statusLabel[selectedEvent.extendedProps.status] || selectedEvent.extendedProps.status}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hasta</p>
                    <p className="text-sm font-semibold text-foreground">{selectedEvent.extendedProps.patientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefon</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Stethoscope className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Doktor</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.doctor}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tarih & Saat</p>
                    <p className="text-sm text-foreground">{formatDateTime(selectedEvent.extendedProps.scheduledAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Randevu Türü</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Şikayet</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.complaint}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarPage;
