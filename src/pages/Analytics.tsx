import { useState, useEffect } from "react";
import { Users, CalendarCheck, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const DAY_LABELS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const barChartConfig: ChartConfig = {
  appointments: { label: "Randevular", color: "hsl(var(--primary))" },
};

const lineChartConfig: ChartConfig = {
  patients: { label: "Hastalar", color: "hsl(var(--primary))" },
  appointments: { label: "Randevular", color: "hsl(var(--success))" },
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  const [weekAppointments, setWeekAppointments] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; appointments: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ week: string; patients: number; appointments: number }[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now);
      startOfMonth.setDate(now.getDate() - 27);
      startOfMonth.setHours(0, 0, 0, 0);

      const [patientsRes, weekAptsRes, monthAptsRes, monthPatientsRes, unreadRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("scheduled_at")
          .gte("scheduled_at", startOfWeek.toISOString())
          .lte("scheduled_at", now.toISOString()),
        supabase.from("appointments").select("scheduled_at")
          .gte("scheduled_at", startOfMonth.toISOString())
          .lte("scheduled_at", now.toISOString()),
        supabase.from("patients").select("created_at")
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", now.toISOString()),
        supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("sender_type", "patient")
          .eq("is_processed", false),
      ]);

      setTotalPatients(patientsRes.count ?? 0);
      setUnreadMessages(unreadRes.count ?? 0);

      const weekly: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekly[d.toDateString()] = 0;
      }
      (weekAptsRes.data || []).forEach((a: any) => {
        const k = new Date(a.scheduled_at).toDateString();
        if (k in weekly) weekly[k]++;
      });
      const weeklyArr = Object.entries(weekly).map(([k, v]) => ({
        day: DAY_LABELS[new Date(k).getDay()],
        appointments: v,
      }));
      setWeeklyData(weeklyArr);
      setWeekAppointments(weeklyArr.reduce((s, x) => s + x.appointments, 0));

      const buckets = [0, 1, 2, 3].map((i) => {
        const start = new Date(startOfMonth);
        start.setDate(startOfMonth.getDate() + i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return { start, end, patients: 0, appointments: 0 };
      });
      (monthPatientsRes.data || []).forEach((p: any) => {
        const t = new Date(p.created_at).getTime();
        const b = buckets.find((x) => t >= x.start.getTime() && t < x.end.getTime());
        if (b) b.patients++;
      });
      (monthAptsRes.data || []).forEach((a: any) => {
        const t = new Date(a.scheduled_at).getTime();
        const b = buckets.find((x) => t >= x.start.getTime() && t < x.end.getTime());
        if (b) b.appointments++;
      });
      setMonthlyData(buckets.map((b, i) => ({ week: `Hafta ${i + 1}`, patients: b.patients, appointments: b.appointments })));

      setLoading(false);
    })();
  }, []);

  const summaryCards = [
    { title: "Toplam Hasta", value: totalPatients.toLocaleString("tr-TR"), icon: Users, color: "text-primary", gradient: "gradient-primary" },
    { title: "Bu Hafta Randevu", value: weekAppointments.toLocaleString("tr-TR"), icon: CalendarCheck, color: "text-success", gradient: "gradient-success" },
    { title: "Okunmamış Mesaj", value: unreadMessages.toLocaleString("tr-TR"), icon: MessageSquare, color: "text-warning", gradient: "gradient-warning" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Analitik</h1>
        <p className="text-sm text-muted-foreground mt-1">Performans ve istatistikler</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={`border-border/60 shadow-card card-interactive rounded-2xl overflow-hidden ${card.gradient}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border/40">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div className="metric-value !text-2xl">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-bold text-foreground">Son 7 Gün — Randevular</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="day" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-bold text-foreground">Aylık Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="week" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="patients" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="appointments" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
