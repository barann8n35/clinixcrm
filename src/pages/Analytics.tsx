import { Users, CalendarCheck, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

const summaryCards = [
  { title: "Toplam Hasta", value: "1,248", change: "+12%", icon: Users, color: "text-primary", gradient: "gradient-primary" },
  { title: "Bu Hafta Randevu", value: "64", change: "+8%", icon: CalendarCheck, color: "text-success", gradient: "gradient-success" },
  { title: "Okunmamış Mesaj", value: "23", change: "-5%", icon: MessageSquare, color: "text-warning", gradient: "gradient-warning" },
  { title: "Dönüşüm Oranı", value: "%74", change: "+3%", icon: TrendingUp, color: "text-primary", gradient: "gradient-primary" },
];

const weeklyData = [
  { day: "Pzt", appointments: 12 },
  { day: "Sal", appointments: 19 },
  { day: "Çar", appointments: 15 },
  { day: "Per", appointments: 22 },
  { day: "Cum", appointments: 18 },
  { day: "Cmt", appointments: 9 },
  { day: "Paz", appointments: 4 },
];

const monthlyData = [
  { week: "Hafta 1", patients: 32, appointments: 45 },
  { week: "Hafta 2", patients: 28, appointments: 52 },
  { week: "Hafta 3", patients: 41, appointments: 48 },
  { week: "Hafta 4", patients: 35, appointments: 60 },
];

const barChartConfig: ChartConfig = {
  appointments: { label: "Randevular", color: "hsl(var(--primary))" },
};

const lineChartConfig: ChartConfig = {
  patients: { label: "Hastalar", color: "hsl(var(--primary))" },
  appointments: { label: "Randevular", color: "hsl(var(--success))" },
};

const Analytics = () => {
  return (
    <div className="p-4 md:p-8 space-y-6 gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Analitik</h1>
        <p className="text-sm text-muted-foreground mt-1">Performans ve istatistikler</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className={`border-border/60 shadow-card card-interactive rounded-2xl overflow-hidden ${card.gradient}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border/40">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${card.change.startsWith('+') ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                    {card.change}
                  </span>
                </div>
                <p className="metric-value !text-2xl">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-bold text-foreground">
                Son 7 Gün — Randevular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="day" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-bold text-foreground">
                Aylık Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="week" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="patients" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="appointments" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
