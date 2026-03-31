import { useEffect, useState } from "react";
import { Calendar, Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight, Sparkles } from "lucide-react";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { IconType } from "react-icons";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { motion } from "framer-motion";
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

const platformConfig: Record<string, { icon: IconType; color: string }> = {
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  instagram: { icon: FaInstagram, color: "#E1306C" },
  telegram: { icon: FaTelegramPlane, color: "#0088cc" },
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

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
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

      const critical = patients
        .filter((p) => p.status === "pending")
        .slice(0, 5)
        .map((p) => ({
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

  const statCards = [
    {
      label: t("dashboard.todayAppointments"),
      value: stats.todayAppointments,
      subtitle: `${stats.pendingCount} ${t("dashboard.pendingApproval")}`,
      icon: Calendar,
      gradient: "gradient-primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: t("dashboard.totalPatients"),
      value: stats.totalPatients,
      icon: Users,
      gradient: "gradient-primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: t("dashboard.totalValue"),
      value: `₺${stats.totalValue.toLocaleString("tr-TR")}`,
      icon: TrendingUp,
      gradient: "gradient-success",
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: t("dashboard.criticalCandidates"),
      value: stats.criticalCount,
      subtitle: t("dashboard.urgentIntervention"),
      subtitleColor: "text-destructive",
      icon: AlertTriangle,
      gradient: "gradient-destructive",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={`rounded-2xl border border-border/60 bg-card p-5 space-y-3 shadow-card card-interactive ${card.gradient}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} strokeWidth={2} />
              </div>
            </div>
            <div>
              <span className="metric-value">{card.value}</span>
              {card.subtitle && (
                <p className={`text-xs mt-1.5 ${card.subtitleColor || "text-muted-foreground"}`}>{card.subtitle}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Appointments List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="lg:col-span-2 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h3 className="text-sm font-display font-bold text-foreground">{t("dashboard.todaySchedule")}</h3>
            <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{todayApts.length} {t("dashboard.appointments")}</span>
          </div>
          <div className="p-4">
            {todayApts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("dashboard.noAppointments")}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Bugün için randevu planlanmamış</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayApts.map((apt, i) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group cursor-pointer"
                  >
                    <div className="text-center w-12 shrink-0">
                      <span className="text-sm font-bold text-foreground">{format(new Date(apt.scheduled_at), "HH:mm")}</span>
                    </div>
                    <div className="w-px h-8 bg-border/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{apt.doctor} · {apt.type}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Critical Candidates */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                </div>
                <h3 className="text-sm font-display font-bold text-foreground">{t("dashboard.criticalList")}</h3>
              </div>
              {criticalPatients.length > 0 && (
                <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold px-1.5">
                  {criticalPatients.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-border/40">
              {criticalPatients.map((p, idx) => {
                const cfg = p.platform ? platformConfig[p.platform] : null;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-5 py-3 transition-all duration-200 hover:bg-accent/40 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {cfg ? (
                        <cfg.icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                      ) : (
                        <span className="text-sm flex-shrink-0">🌐</span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive flex-shrink-0 ml-3">
                      {p.score}/10
                    </span>
                  </div>
                );
              })}
              {criticalPatients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Kritik aday yok</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">Tüm hastalar stabil durumda</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Source Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="rounded-2xl border border-border/60 bg-card shadow-card"
          >
            <div className="px-5 py-4 border-b border-border/60">
              <h3 className="text-sm font-display font-bold text-foreground">{t("dashboard.sourceDistribution")}</h3>
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
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
