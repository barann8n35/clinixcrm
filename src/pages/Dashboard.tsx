import { useEffect, useState } from "react";
import { Calendar, Users, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { IconType } from "react-icons";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  todayAppointments: number;
  pendingCount: number;
  totalPatients: number;
  totalValue: number;
  criticalCount: number;
}

interface CriticalPatient {
  id: string;
  name: string;
  score: number;
  platform: string | null;
}

interface TodayAppointment {
  id: string;
  patient_name: string;
  doctor: string;
  type: string;
  scheduled_at: string;
  status: string;
}

const platformIcon: Record<string, string> = {
  whatsapp: "🟢",
  telegram: "✈️",
  instagram: "🟣",
};

const pieData = [
  { name: "WhatsApp", value: 45, color: "hsl(142 71% 45%)" },
  { name: "Instagram", value: 25, color: "hsl(330 80% 60%)" },
  { name: "Telegram", value: 15, color: "hsl(200 80% 50%)" },
  { name: "Web", value: 15, color: "hsl(38 92% 50%)" },
];

const pieConfig: ChartConfig = {
  whatsapp: { label: "WhatsApp", color: "hsl(142 71% 45%)" },
  instagram: { label: "Instagram", color: "hsl(330 80% 60%)" },
  telegram: { label: "Telegram", color: "hsl(200 80% 50%)" },
  web: { label: "Web", color: "hsl(38 92% 50%)" },
};

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingCount: 0,
    totalPatients: 0,
    totalValue: 28200,
    criticalCount: 0,
  });
  const [criticalPatients, setCriticalPatients] = useState<CriticalPatient[]>([]);
  const [todayApts, setTodayApts] = useState<TodayAppointment[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [patientsRes, aptsRes, todayAptsRes] = await Promise.all([
        supabase.from("patients").select("id, name, platform, status", { count: "exact" }),
        supabase.from("appointments").select("id, status").gte("scheduled_at", startOfDay).lt("scheduled_at", endOfDay),
        supabase.from("appointments").select("id, doctor, type, scheduled_at, status, patients(name)").gte("scheduled_at", startOfDay).lt("scheduled_at", endOfDay).order("scheduled_at", { ascending: true }),
      ]);

      const patients = patientsRes.data || [];
      const apts = aptsRes.data || [];
      const pendingCount = apts.filter((a) => a.status === "pending" || a.status === "upcoming").length;

      // Mock critical patients from existing data
      const critical = patients
        .filter((p) => p.status === "pending")
        .slice(0, 5)
        .map((p, i) => ({
          id: p.id,
          name: p.name,
          score: Math.floor(Math.random() * 3) + 7,
          platform: p.platform,
        }));

      setCriticalPatients(critical);
      setTodayApts(
        (todayAptsRes.data || []).map((a: any) => ({
          id: a.id,
          patient_name: a.patients?.name || "—",
          doctor: a.doctor,
          type: a.type,
          scheduled_at: a.scheduled_at,
          status: a.status,
        }))
      );

      setStats({
        todayAppointments: apts.length,
        pendingCount,
        totalPatients: patients.length,
        totalValue: 28200,
        criticalCount: critical.length,
      });
    }
    load();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.todayAppointments")}</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-display font-bold text-foreground">{stats.todayAppointments}</span>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} {t("dashboard.pendingApproval")}</p>
          </div>
        </div>

        {/* Total Patients */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.totalPatients")}</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-display font-bold text-foreground">{stats.totalPatients}</span>
          </div>
        </div>

        {/* Total Value */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.totalValue")}</span>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-display font-bold text-foreground">₺{stats.totalValue.toLocaleString("tr-TR")}</span>
          </div>
        </div>

        {/* Critical Candidates */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.criticalCandidates")}</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-display font-bold text-foreground">{stats.criticalCount}</span>
            <p className="text-xs text-destructive mt-1">{t("dashboard.urgentIntervention")}</p>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Appointments List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-display font-semibold text-foreground">{t("dashboard.todaySchedule")}</h3>
            <span className="text-xs text-muted-foreground">{todayApts.length} {t("dashboard.appointments")}</span>
          </div>
          <div className="p-4">
            {todayApts.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                {t("dashboard.noAppointments")}
              </div>
            ) : (
              <div className="space-y-2">
                {todayApts.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="text-center w-12 shrink-0">
                      <span className="text-sm font-semibold text-foreground">{format(new Date(apt.scheduled_at), "HH:mm")}</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{apt.doctor} · {apt.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Critical Candidates */}
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-display font-semibold text-foreground">{t("dashboard.criticalList")}</h3>
              </div>
              {criticalPatients.length > 0 && (
                <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold px-1.5">
                  {criticalPatients.length}
                </span>
              )}
            </div>
            <div className="p-3">
              {criticalPatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{p.platform ? platformIcon[p.platform] || "🌐" : "🌐"}</span>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                    {p.score}/10
                  </span>
                </div>
              ))}
              {criticalPatients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </div>

          {/* Source Distribution */}
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-display font-semibold text-foreground">{t("dashboard.sourceDistribution")}</h3>
            </div>
            <div className="p-4 flex justify-center">
              <ChartContainer config={pieConfig} className="h-[180px] w-[180px]">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-3 justify-center">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
