import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Clock, User, Filter, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { tr } from "date-fns/locale";
import { motion } from "framer-motion";
import NewAppointmentDialog from "@/components/appointments/NewAppointmentDialog";

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
};

const statusLabel: Record<string, string> = {
  upcoming: "Yaklaşan",
  approved: "Onaylı",
  cancelled: "İptal",
  rescheduled: "Ertelendi",
  completed: "Tamamlandı",
  "in-progress": "Devam Ediyor",
};

type FilterType = "all" | "upcoming" | "approved" | "cancelled" | "past";

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

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

    if (data) {
      setAppointments(data.map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAppointments]);

  const filtered = useMemo(
    () => (filter === "all" ? appointments : appointments.filter((a) => a.status === filter)),
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
    { key: "cancelled", label: "İptal" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto gradient-mesh">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Randevular</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} randevu (bugün ve sonrası)
          </p>
        </div>
        <NewAppointmentDialog onCreated={fetchAppointments} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center justify-center min-h-[300px] gap-4 shadow-card"
        >
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

      {!loading &&
        grouped.map(([dateKey, items]) => (
          <div key={dateKey} className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-background/80 backdrop-blur-sm py-1.5 z-10">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateLabel(dateKey)}
            </h2>
            <div className="grid gap-2">
              {items.map((apt, i) => {
                const time = format(parseISO(apt.scheduled_at), "HH:mm");
                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4 shadow-card card-interactive"
                  >
                    <div className="text-center shrink-0 w-14">
                      <div className="text-lg font-extrabold text-foreground leading-tight">{time.split(":")[0]}</div>
                      <div className="text-xs text-muted-foreground">:{time.split(":")[1]}</div>
                    </div>

                    <div className="w-px h-10 bg-border/40 shrink-0" />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {apt.patient_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${statusStyles[apt.status] || statusStyles.upcoming}`}
                        >
                          {statusLabel[apt.status] || apt.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {apt.doctor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {apt.type}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground/70 shrink-0">
                      {format(parseISO(apt.scheduled_at), "dd.MM.yyyy", { locale: tr })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

export default Appointments;
