import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Calendar, Clock, User, Filter, CalendarPlus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { tr } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import NewAppointmentDialog from "@/components/appointments/NewAppointmentDialog";
import { PatientDetailModal } from "@/components/patients/PatientDetailModal";

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor: string;
  type: string;
  scheduled_at: string;
  status: string;
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rescheduled: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-muted text-muted-foreground border-border",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  arrived: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const statusLabel: Record<string, string> = {
  upcoming: "Yaklaşan",
  approved: "Onaylı",
  cancelled: "İptal",
  rescheduled: "Ertelendi",
  completed: "Tamamlandı",
  "in-progress": "Devam Ediyor",
  arrived: "Geldi ✓",
};

type FilterType = "all" | "upcoming" | "approved" | "cancelled" | "past" | "arrived";

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const pendingArrivals = useRef<Set<string>>(new Set());

  const mapRow = (a: any): Appointment => ({
    id: a.id,
    patient_id: a.patient_id,
    patient_name: a.patients?.name || "Bilinmiyor",
    doctor: a.doctor,
    type: a.type,
    scheduled_at: a.scheduled_at,
    status: a.status,
  });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("id, patient_id, doctor, type, scheduled_at, status, patients(name)");

    if (filter === "past") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.lt("scheduled_at", todayStart.toISOString()).order("scheduled_at", { ascending: false });
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte("scheduled_at", todayStart.toISOString()).order("scheduled_at", { ascending: true });
    }

    const { data } = await query;
    if (data) setAppointments(data.map(mapRow));
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  const handleMarkArrived = async (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    if (pendingArrivals.current.has(apt.id)) return;
    pendingArrivals.current.add(apt.id);
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: "arrived" } : a));
    try {
      const [r1, r2] = await Promise.all([
        supabase.from("appointments").update({ status: "arrived" }).eq("id", apt.id),
        supabase.from("patients").update({ status: "arrived" }).eq("id", apt.patient_id),
      ]);
      if (r1.error || r2.error) throw new Error("update failed");
      toast.success("Hasta bekleme salonuna alındı ✅");
    } catch {
      toast.error("Durum güncellenemedi");
      // Revert optimistic update
      setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: apt.status } : a));
    } finally {
      pendingArrivals.current.delete(apt.id);
    }
  };

  const filtered = useMemo(
    () => (filter === "all" || filter === "past" ? appointments : appointments.filter((a) => a.status === filter)),
    [appointments, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const dateKey = format(parseISO(a.scheduled_at), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const formatDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Bugün";
    if (isTomorrow(d)) return "Yarın";
    return format(d, "dd.MM.yyyy, EEEE", { locale: tr });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Tümü" },
    { key: "upcoming", label: "Yaklaşan" },
    { key: "approved", label: "Onaylı" },
    { key: "arrived", label: "Geldi" },
    { key: "cancelled", label: "İptal" },
    { key: "past", label: "Geçmiş" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-display font-extrabold text-foreground tracking-tight truncate">Randevular</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{appointments.length} randevu</p>
          </div>
          <div className="shrink-0">
            <NewAppointmentDialog onCreated={fetchAppointments} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap shrink-0 ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/60 hover:bg-accent hover:border-primary/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-border/60 bg-card p-8 md:p-12 flex flex-col items-center justify-center min-h-[200px] md:min-h-[300px] gap-4 shadow-card">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
            <CalendarPlus className="w-9 h-9 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {filter !== "all" ? "Bu filtreyle eşleşen randevu yok" : "Bugün için planlanmış bir randevu bulunmuyor."}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">Yeni randevu eklemek için yukarıdaki butonu kullanın</p>
          </div>
        </motion.div>
      )}

      {!loading && grouped.map(([dateKey, items]) => (
        <div key={dateKey} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-background/80 backdrop-blur-sm py-1.5 z-10">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateLabel(dateKey)}
          </h2>
          <div className="grid gap-2">
            {items.map((apt, i) => {
              const time = format(parseISO(apt.scheduled_at), "HH:mm");
              const isArrived = apt.status === "arrived";
              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedPatientId(apt.patient_id)}
                  className={`rounded-2xl border p-3 md:p-4 flex items-start md:items-center gap-3 md:gap-4 shadow-sm hover:shadow-md card-interactive cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                    isArrived
                      ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-border/60 bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="text-center shrink-0 w-11 md:w-14">
                    <div className="text-base md:text-lg font-extrabold text-foreground leading-tight">{time.split(":")[0]}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground">:{time.split(":")[1]}</div>
                  </div>
                  <div className="w-px h-8 md:h-10 bg-border/40 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="font-semibold text-xs md:text-sm text-foreground truncate">{apt.patient_name}</span>
                      <Badge variant="outline" className={`text-[9px] md:text-[10px] px-1.5 py-0 shrink-0 ${statusStyles[apt.status] || statusStyles.upcoming}`}>
                        {statusLabel[apt.status] || apt.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] md:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" /> {apt.doctor}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> {apt.type}</span>
                    </div>
                  </div>
                  {/* Arrived check button */}
                  {!isArrived && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-all duration-200 hover:scale-110 active:scale-95"
                          onClick={(e) => handleMarkArrived(e, apt)}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p className="text-xs">Hasta Geldi</p></TooltipContent>
                    </Tooltip>
                  )}
                  {isArrived && (
                    <div className="shrink-0 flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      <PatientDetailModal
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  );
};

export default Appointments;
