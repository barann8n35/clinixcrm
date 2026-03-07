import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Clock, User, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { tr } from "date-fns/locale";
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
  upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  rescheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<string, string> = {
  upcoming: "Yaklaşan",
  approved: "Onaylı",
  cancelled: "İptal",
  rescheduled: "Ertelendi",
  completed: "Tamamlandı",
};

type FilterType = "all" | "upcoming" | "approved" | "cancelled";

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor, type, scheduled_at, status, patients(name)")
      .order("scheduled_at", { ascending: true });

    if (data) {
      setAppointments(
        data.map((a: any) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: a.patients?.name || "Bilinmiyor",
          doctor: a.doctor,
          type: a.type,
          scheduled_at: a.scheduled_at,
          status: a.status,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = useMemo(
    () => (filter === "all" ? appointments : appointments.filter((a) => a.status === filter)),
    [appointments, filter]
  );

  // Group by date
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
    return format(d, "d MMMM yyyy, EEEE", { locale: tr });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Tümü" },
    { key: "upcoming", label: "Yaklaşan" },
    { key: "approved", label: "Onaylı" },
    { key: "cancelled", label: "İptal" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Randevular</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} randevu
          </p>
        </div>
        <NewAppointmentDialog onCreated={fetchAppointments} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Calendar className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {filter !== "all" ? "Bu filtreyle eşleşen randevu yok." : "Henüz randevu kaydı yok."}
          </p>
        </div>
      )}

      {/* Grouped list */}
      {!loading &&
        grouped.map(([dateKey, items]) => (
          <div key={dateKey} className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-background py-1 z-10">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateLabel(dateKey)}
            </h2>
            <div className="grid gap-2">
              {items.map((apt) => {
                const time = format(parseISO(apt.scheduled_at), "HH:mm");
                const past = isPast(parseISO(apt.scheduled_at)) && apt.status !== "completed";
                return (
                  <div
                    key={apt.id}
                    className={`rounded-xl border border-border bg-card p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors ${past ? "opacity-60" : ""}`}
                  >
                    {/* Time */}
                    <div className="text-center shrink-0 w-14">
                      <div className="text-lg font-bold text-foreground leading-tight">{time.split(":")[0]}</div>
                      <div className="text-xs text-muted-foreground">:{time.split(":")[1]}</div>
                    </div>

                    <div className="w-px h-10 bg-border shrink-0" />

                    {/* Details */}
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
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

export default Appointments;
