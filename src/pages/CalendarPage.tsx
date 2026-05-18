import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  User, Phone, Stethoscope, FileText, Clock, CalendarDays, StickyNote,
  MapPin, Pencil, CheckCircle2, ChevronLeft, ChevronRight, Plus, Sparkles,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    patientId: string;
  };
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  upcoming: { bg: "hsl(var(--primary))", border: "hsl(var(--primary))", text: "#fff" },
  approved: { bg: "hsl(var(--success))", border: "hsl(var(--success))", text: "#fff" },
  cancelled: { bg: "hsl(var(--destructive))", border: "hsl(var(--destructive))", text: "#fff" },
  rescheduled: { bg: "hsl(var(--warning))", border: "hsl(var(--warning))", text: "#fff" },
  completed: { bg: "hsl(var(--muted-foreground))", border: "hsl(var(--muted-foreground))", text: "#fff" },
  pending: { bg: "hsl(var(--primary))", border: "hsl(var(--primary))", text: "#fff" },
  arrived: { bg: "#10b981", border: "#059669", text: "#fff" },
};

const statusLabel: Record<string, string> = {
  upcoming: "Yaklaşan",
  approved: "Onaylı",
  cancelled: "İptal",
  rescheduled: "Yeniden Planlandı",
  completed: "Tamamlandı",
  pending: "Beklemede",
  arrived: "Geldi ✓",
};

const typeColors: Record<string, string> = {
  "Ön Muayene": "#6366f1",
  "Muayene": "#0ea5e9",
  "Kontrol": "#22c55e",
  "Operasyon": "#ef4444",
};

const typeBgColors: Record<string, string> = {
  "Ön Muayene": "rgba(99,102,241,0.08)",
  "Muayene": "rgba(14,165,233,0.08)",
  "Kontrol": "rgba(34,197,94,0.08)",
  "Operasyon": "rgba(239,68,68,0.08)",
};

// Stable doctor color palette (HSL)
const DOCTOR_PALETTE = [
  { border: "hsl(210, 90%, 50%)", bg: "hsla(210, 90%, 50%, 0.08)" },   // blue
  { border: "hsl(280, 70%, 55%)", bg: "hsla(280, 70%, 55%, 0.08)" },   // purple
  { border: "hsl(160, 70%, 40%)", bg: "hsla(160, 70%, 40%, 0.08)" },   // teal
  { border: "hsl(25, 90%, 55%)",  bg: "hsla(25, 90%, 55%, 0.08)"  },   // orange
  { border: "hsl(340, 75%, 55%)", bg: "hsla(340, 75%, 55%, 0.08)" },   // pink
  { border: "hsl(60, 70%, 45%)",  bg: "hsla(60, 70%, 45%, 0.08)"  },   // yellow-green
];
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function doctorColor(name: string) {
  if (!name || name === "—") return null;
  return DOCTOR_PALETTE[hashString(name) % DOCTOR_PALETTE.length];
}

const VIEWS = [
  { key: "dayGridMonth", label: "Ay" },
  { key: "timeGridWeek", label: "Hafta" },
  { key: "timeGridDay", label: "Gün" },
  { key: "listWeek", label: "Ajanda" },
];

const CalendarPage = () => {
  const { t } = useTranslation();
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [currentView, setCurrentView] = useState("timeGridWeek");
  const [currentTitle, setCurrentTitle] = useState("");
  const [markingArrived, setMarkingArrived] = useState(false);
  const [quickAppt, setQuickAppt] = useState<{ open: boolean; date: Date; time: string }>({
    open: false, date: new Date(), time: "09:00",
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
        id: a.id, title: fullName, start: a.scheduled_at,
        backgroundColor: colors.bg, borderColor: colors.border, textColor: colors.text,
        extendedProps: {
          doctor: a.doctor, type: a.type, status: a.status,
          complaint: p?.complaint || "—", patientName: fullName,
          phone: p?.phone || "—", location: p?.location || "—",
          scheduledAt: a.scheduled_at, internalNotes: p?.internal_notes || "",
          appointmentId: a.id, patientId: a.patient_id,
        },
      });
    });
    const covered = new Set((apptData || []).map((a: any) => a.patient_id));
    (patientData || []).forEach((p: any) => {
      if (covered.has(p.id)) return;
      const fullName = [p.name, p.surname].filter(Boolean).join(" ");
      const colors = statusColors[p.status] || statusColors.pending;
      eventsArr.push({
        id: `patient-${p.id}`, title: fullName, start: p.appointment_date,
        backgroundColor: colors.bg, borderColor: colors.border, textColor: colors.text,
        extendedProps: {
          doctor: "—", type: "Genel", status: p.status,
          complaint: p.complaint || "—", patientName: fullName,
          phone: p.phone || "—", location: p.location || "—",
          scheduledAt: p.appointment_date, internalNotes: p.internal_notes || "",
          appointmentId: "", patientId: p.id,
        },
      });
    });
    setEvents(eventsArr);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    const ch1 = supabase.channel("calendar-appointments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => loadEvents()).subscribe();
    const ch2 = supabase.channel("calendar-patients-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => loadEvents()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [loadEvents]);

  // Sync title and view when calendar mounts/changes
  const updateTitle = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) setCurrentTitle(api.view.title);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (e.key === "ArrowLeft") { api.prev(); updateTitle(); }
      else if (e.key === "ArrowRight") { api.next(); updateTitle(); }
      else if (e.key === "t" || e.key === "T") { api.today(); updateTitle(); }
      else if (e.key === "m" || e.key === "M") { api.changeView("dayGridMonth"); setCurrentView("dayGridMonth"); updateTitle(); }
      else if (e.key === "w" || e.key === "W") { api.changeView("timeGridWeek"); setCurrentView("timeGridWeek"); updateTitle(); }
      else if (e.key === "d" || e.key === "D") { api.changeView("timeGridDay"); setCurrentView("timeGridDay"); updateTitle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updateTitle]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id, title: event.title, start: event.startStr,
      backgroundColor: event.backgroundColor, borderColor: event.borderColor, textColor: event.textColor,
      extendedProps: { ...event.extendedProps } as any,
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

  // Drag & drop / resize → update Supabase
  const handleEventChange = async (info: any) => {
    const apptId = info.event.extendedProps?.appointmentId;
    if (!apptId) {
      toast.error("Bu kayıt sürüklenemiyor.");
      info.revert();
      return;
    }
    const newStart = info.event.start as Date;
    const { error } = await supabase
      .from("appointments")
      .update({ scheduled_at: newStart.toISOString() })
      .eq("id", apptId);
    if (error) {
      toast.error(error.message.includes("dolu") ? "Bu saat dolu. Başka bir slot seçin." : "Güncellenemedi");
      info.revert();
    } else {
      toast.success("Randevu yeni slota taşındı ✓");
      loadEvents();
    }
  };

  const formatDateTime = (dateStr: string) => {
    try { return format(new Date(dateStr), "d MMMM yyyy, HH:mm", { locale: tr }); }
    catch { return dateStr; }
  };

  const abbreviateName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const openEdit = () => {
    if (!selectedEvent || !selectedEvent.extendedProps.appointmentId) return;
    setEditOpen(true);
  };

  const handleMarkArrived = async () => {
    if (!selectedEvent || markingArrived) return;
    setMarkingArrived(true);
    try {
      const apptId = selectedEvent.extendedProps.appointmentId;
      const patientId = selectedEvent.extendedProps.patientId;
      await Promise.all([
        apptId ? supabase.from("appointments").update({ status: "arrived" }).eq("id", apptId) : Promise.resolve(),
        patientId ? supabase.from("patients").update({ status: "arrived" }).eq("id", patientId) : Promise.resolve(),
      ]);
      toast.success("Hasta bekleme salonuna alındı ✅");
      setSelectedEvent(null);
    } catch { toast.error("Durum güncellenemedi"); }
    finally { setMarkingArrived(false); }
  };

  const isSelectedArrived = selectedEvent?.extendedProps.status === "arrived";

  // Today summary
  const todayStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const todays = events.filter(e => {
      const d = new Date(e.start);
      return d >= today && d < tomorrow;
    });
    return {
      total: todays.length,
      arrived: todays.filter(e => e.extendedProps.status === "arrived").length,
      remaining: todays.filter(e => e.extendedProps.status !== "arrived" && e.extendedProps.status !== "cancelled" && e.extendedProps.status !== "completed").length,
    };
  }, [events]);

  const goPrev = () => { calendarRef.current?.getApi().prev(); updateTitle(); };
  const goNext = () => { calendarRef.current?.getApi().next(); updateTitle(); };
  const goToday = () => { calendarRef.current?.getApi().today(); updateTitle(); };
  const switchView = (v: string) => {
    calendarRef.current?.getApi().changeView(v);
    setCurrentView(v);
    updateTitle();
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground tracking-tight">
                Klinik Takvimi
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">
              Boş slota tıklayarak randevu ekleyin · Sürükleyip bırakarak taşıyın · <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border font-mono">T</kbd> bugün, <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-muted border border-border font-mono">←/→</kbd> gezin
            </p>
          </div>

          {/* Today summary chips */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-card border border-border/60 px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bugün</span>
              <span className="text-xs font-bold text-foreground tabular-nums">{todayStats.total}</span>
              <span className="w-px h-3 bg-border" />
              <span className="text-[10px] text-emerald-600 font-semibold tabular-nums">{todayStats.arrived} geldi</span>
              <span className="w-px h-3 bg-border" />
              <span className="text-[10px] text-primary font-semibold tabular-nums">{todayStats.remaining} kaldı</span>
            </div>
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
          {/* Left: nav */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={goToday}
              className="h-8 px-3 rounded-lg font-semibold text-xs transition-all duration-200 hover:scale-105 active:scale-95">
              Bugün
            </Button>
            <Button variant="ghost" size="icon" onClick={goPrev}
              className="h-8 w-8 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext}
              className="h-8 w-8 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="ml-2 font-display font-bold text-base md:text-lg text-foreground tabular-nums capitalize">
              {currentTitle}
            </h2>
          </div>

          {/* Right: segmented view switcher */}
          <div className="relative inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/40">
            {VIEWS.map((v) => {
              const active = currentView === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => switchView(v.key)}
                  className={cn(
                    "relative z-10 px-3 md:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.div layoutId="view-pill"
                      className="absolute inset-0 rounded-lg bg-primary shadow-md"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative">{v.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border/60 bg-card shadow-card p-3 md:p-5 clinix-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            events={events}
            locale="tr"
            firstDay={1}
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
            editable
            eventResizableFromStart={false}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventChange={handleEventChange}
            datesSet={updateTitle}
            viewDidMount={(info) => { setCurrentView(info.view.type); updateTitle(); }}
            moreLinkClick={(info) => {
              const calApi = calendarRef.current?.getApi();
              if (calApi) calApi.changeView("timeGridDay", info.date);
              return "none";
            }}
            moreLinkContent={(arg) => (
              <span className="text-[10px] font-semibold text-primary cursor-pointer hover:underline">
                +{arg.num} daha
              </span>
            )}
            eventContent={(arg) => {
              const eventType = arg.event.extendedProps.type || "";
              const eventStatus = arg.event.extendedProps.status || "";
              const isArrived = eventStatus === "arrived";
              const borderColor = isArrived ? "#10b981" : (typeColors[eventType] || "hsl(var(--primary))");
              const bgColor = isArrived ? "rgba(16,185,129,0.1)" : (typeBgColors[eventType] || "transparent");
              const shortName = abbreviateName(arg.event.title);
              const timeText = arg.timeText;
              const viewType = calendarRef.current?.getApi()?.view?.type || currentView;

              if (viewType === "dayGridMonth") {
                return (
                  <div className="px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer rounded-md transition-all duration-200 flex items-center gap-1"
                    style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "6px", backgroundColor: bgColor }}>
                    {isArrived && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                    <span className="opacity-70 tabular-nums">{timeText}</span>
                    <span className="font-semibold text-foreground">{shortName}</span>
                  </div>
                );
              }
              if (viewType.startsWith("list")) {
                return (
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: borderColor }} />
                    <span className="font-semibold text-foreground">{arg.event.title}</span>
                    <span className="text-xs text-muted-foreground">· {eventType}</span>
                    {isArrived && <span className="text-[10px] text-emerald-600 font-bold">Geldi ✓</span>}
                  </div>
                );
              }

              const fullName = arg.event.extendedProps.patientName || arg.event.title;
              const complaint = arg.event.extendedProps.complaint;
              const showComplaint = complaint && complaint !== "—";
              return (
                <div className="px-2 py-1 text-[11px] cursor-pointer rounded-md transition-all duration-200 space-y-0.5 h-full"
                  style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "8px", backgroundColor: bgColor }}>
                  <div className="flex items-center gap-1.5">
                    {isArrived && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                    <span className="opacity-70 text-[10px] tabular-nums">{timeText}</span>
                    <span className="font-bold truncate text-foreground">{fullName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-70">
                    <span className="truncate">{eventType}</span>
                    {isArrived && <span className="text-emerald-600 font-semibold">Geldi ✓</span>}
                    {showComplaint && !isArrived && (<><span>·</span><span className="truncate">{complaint}</span></>)}
                  </div>
                </div>
              );
            }}
          />
        </motion.div>

        {/* Floating add button */}
        <motion.button
          initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          onClick={() => {
            const now = new Date();
            const mins = now.getMinutes() < 30 ? "00" : "30";
            setQuickAppt({ open: true, date: now, time: `${String(now.getHours()).padStart(2, "0")}:${mins}` });
          }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-float flex items-center justify-center hover:shadow-glow transition-shadow"
          aria-label="Yeni Randevu"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      <QuickAppointmentDialog
        open={quickAppt.open}
        onOpenChange={(v) => setQuickAppt((prev) => ({ ...prev, open: v }))}
        date={quickAppt.date}
        time={quickAppt.time}
        onCreated={loadEvents}
      />

      {selectedEvent && selectedEvent.extendedProps.appointmentId && (
        <EditAppointmentDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          appointmentId={selectedEvent.extendedProps.appointmentId}
          currentDate={new Date(selectedEvent.extendedProps.scheduledAt)}
          currentTime={format(new Date(selectedEvent.extendedProps.scheduledAt), "HH:mm")}
          currentType={selectedEvent.extendedProps.type}
          onUpdated={() => { loadEvents(); setSelectedEvent(null); }}
        />
      )}

      <Dialog open={!!selectedEvent && !editOpen} onOpenChange={(v) => !v && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl shadow-elevated">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Randevu Detayı
              </DialogTitle>
              <div className="flex items-center gap-1">
                {selectedEvent && !isSelectedArrived && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-all duration-200 hover:scale-110 active:scale-95"
                        onClick={handleMarkArrived} disabled={markingArrived}>
                        <CheckCircle2 className={`w-4 h-4 ${markingArrived ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Hasta Geldi</p></TooltipContent>
                  </Tooltip>
                )}
                {selectedEvent?.extendedProps.appointmentId && (
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
                    onClick={openEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Badge className="text-xs"
                  style={{ backgroundColor: selectedEvent.backgroundColor, color: selectedEvent.textColor, borderColor: selectedEvent.borderColor }}>
                  {statusLabel[selectedEvent.extendedProps.status] || selectedEvent.extendedProps.status}
                </Badge>
                <Badge variant="outline" className="text-xs">{selectedEvent.extendedProps.type}</Badge>
              </div>
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                {[
                  { Icon: User, label: "Hasta", value: selectedEvent.extendedProps.patientName },
                  { Icon: Phone, label: "Telefon", value: selectedEvent.extendedProps.phone },
                  { Icon: MapPin, label: "Konum", value: selectedEvent.extendedProps.location },
                  { Icon: Stethoscope, label: "Doktor", value: selectedEvent.extendedProps.doctor },
                  { Icon: Clock, label: "Tarih & Saat", value: formatDateTime(selectedEvent.extendedProps.scheduledAt) },
                  { Icon: FileText, label: "Şikayet", value: selectedEvent.extendedProps.complaint },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
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
