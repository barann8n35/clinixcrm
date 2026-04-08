import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { User, Phone, Stethoscope, FileText, Clock, CalendarDays, StickyNote, MapPin, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuickAppointmentDialog from "@/components/appointments/QuickAppointmentDialog";
import EditAppointmentDialog from "@/components/appointments/EditAppointmentDialog";

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
    location: string;
    scheduledAt: string;
    internalNotes: string;
    appointmentId: string;
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

// Type-based left border colors for calendar cells
const typeColors: Record<string, string> = {
  "Ön Muayene": "#6366f1",  // indigo
  "Muayene": "#0ea5e9",     // sky
  "Kontrol": "#22c55e",     // green
  "Operasyon": "#ef4444",   // red
};

const CalendarPage = () => {
  const { t } = useTranslation();
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [quickAppt, setQuickAppt] = useState<{ open: boolean; date: Date; time: string }>({
    open: false,
    date: new Date(),
    time: "09:00",
  });

  const loadEvents = useCallback(async () => {
    const { data: apptData } = await supabase
      .from("appointments")
      .select("id, doctor, type, scheduled_at, status, patient_id, patients(name, surname, phone, complaint, location, internal_notes)")
      .order("scheduled_at", { ascending: true });

    const { data: patientData } = await supabase
      .from("patients")
      .select("id, name, surname, complaint, appointment_date, status, phone, location, internal_notes")
      .not("appointment_date", "is", null);

    const eventsArr: CalendarEvent[] = [];

    (apptData || []).forEach((a: any) => {
      const p = a.patients;
      const fullName = p ? [p.name, p.surname].filter(Boolean).join(" ") : "—";
      const colors = statusColors[a.status] || statusColors.upcoming;
      eventsArr.push({
        id: a.id,
        title: fullName,
        start: a.scheduled_at,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          doctor: a.doctor,
          type: a.type,
          status: a.status,
          complaint: p?.complaint || "—",
          patientName: fullName,
          phone: p?.phone || "—",
          location: p?.location || "—",
          scheduledAt: a.scheduled_at,
          internalNotes: p?.internal_notes || "",
          appointmentId: a.id,
        },
      });
    });

    const coveredPatientIds = new Set((apptData || []).map((a: any) => a.patient_id));
    (patientData || []).forEach((p: any) => {
      if (coveredPatientIds.has(p.id)) return;
      const fullName = [p.name, p.surname].filter(Boolean).join(" ");
      const colors = statusColors[p.status] || statusColors.pending;
      eventsArr.push({
        id: `patient-${p.id}`,
        title: fullName,
        start: p.appointment_date,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          doctor: "—",
          type: "Genel",
          status: p.status,
          complaint: p.complaint || "—",
          patientName: fullName,
          phone: p.phone || "—",
          location: p.location || "—",
          scheduledAt: p.appointment_date,
          internalNotes: p.internal_notes || "",
          appointmentId: "",
        },
      });
    });

    setEvents(eventsArr);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

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
        location: event.extendedProps.location,
        scheduledAt: event.extendedProps.scheduledAt,
        internalNotes: event.extendedProps.internalNotes,
        appointmentId: event.extendedProps.appointmentId,
      },
    });
  };

  const handleDateClick = (info: any) => {
    const clickedDate = new Date(info.dateStr);
    const hours = clickedDate.getHours();
    const minutes = clickedDate.getMinutes();
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const finalTime = hours === 0 && minutes === 0 ? "09:00" : timeStr;
    setQuickAppt({ open: true, date: clickedDate, time: finalTime });
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMMM yyyy, HH:mm", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  // Abbreviate name: "Kenan Tüfekçi" → "Kenan T."
  const abbreviateName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const openEdit = () => {
    if (!selectedEvent || !selectedEvent.extendedProps.appointmentId) return;
    setEditOpen(true);
  };

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
            {t("sidebar.calendar", "Takvim")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Randevuları ay, hafta ve gün bazında görüntüleyin — boş alana tıklayarak hızlı randevu oluşturun
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border/60 bg-card shadow-card p-4 md:p-6 clinix-calendar"
        >
          <FullCalendar
            ref={calendarRef}
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
            selectable
            dateClick={handleDateClick}
            buttonText={{
              today: "Bugün",
              month: "Ay",
              week: "Hafta",
              day: "Gün",
            }}
            eventClick={handleEventClick}
            moreLinkClick={(info) => {
              const calApi = calendarRef.current?.getApi();
              if (calApi) {
                calApi.changeView("timeGridDay", info.date);
              }
              return "none";
            }}
            moreLinkContent={(arg) => (
              <span className="text-[10px] font-semibold text-primary cursor-pointer hover:underline">
                +{arg.num} daha...
              </span>
            )}
            eventContent={(arg) => {
              const eventType = arg.event.extendedProps.type || "";
              const borderColor = typeColors[eventType] || "hsl(var(--primary))";
              const shortName = abbreviateName(arg.event.title);
              const timeText = arg.timeText;

              return (
                <div
                  className="px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer rounded-sm"
                  style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "6px" }}
                >
                  <span className="opacity-75">{timeText}</span>{" "}
                  <span className="font-semibold">{shortName}</span>
                </div>
              );
            }}
          />
        </motion.div>
      </div>

      {/* Quick Appointment Dialog */}
      <QuickAppointmentDialog
        open={quickAppt.open}
        onOpenChange={(v) => setQuickAppt((prev) => ({ ...prev, open: v }))}
        date={quickAppt.date}
        time={quickAppt.time}
        onCreated={loadEvents}
      />

      {/* Edit Appointment Dialog */}
      {selectedEvent && selectedEvent.extendedProps.appointmentId && (
        <EditAppointmentDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          appointmentId={selectedEvent.extendedProps.appointmentId}
          currentDate={new Date(selectedEvent.extendedProps.scheduledAt)}
          currentTime={format(new Date(selectedEvent.extendedProps.scheduledAt), "HH:mm")}
          currentType={selectedEvent.extendedProps.type}
          onUpdated={() => {
            loadEvents();
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent && !editOpen} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Randevu Detayı
              </DialogTitle>
              {selectedEvent?.extendedProps.appointmentId && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={openEdit}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-2">
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
                <Badge variant="outline" className="text-xs">
                  {selectedEvent.extendedProps.type}
                </Badge>
              </div>

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
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Konum</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.location}</p>
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
                    <p className="text-xs text-muted-foreground">Şikayet</p>
                    <p className="text-sm text-foreground">{selectedEvent.extendedProps.complaint}</p>
                  </div>
                </div>
                {selectedEvent.extendedProps.internalNotes && (
                  <div className="flex items-start gap-3 pt-2 border-t border-border/40">
                    <StickyNote className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">İç Notlar</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedEvent.extendedProps.internalNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarPage;
