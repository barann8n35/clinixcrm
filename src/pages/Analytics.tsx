import { Users, CalendarCheck, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

const summaryCards = [
  { title: "Toplam Hasta", value: "1,248", change: "+12%", icon: Users, color: "text-primary" },
  { title: "Bu Hafta Randevu", value: "64", change: "+8%", icon: CalendarCheck, color: "text-success" },
  { title: "Okunmamış Mesaj", value: "23", change: "-5%", icon: MessageSquare, color: "text-warning" },
  { title: "Dönüşüm Oranı", value: "%74", change: "+3%", icon: TrendingUp, color: "text-primary" },
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
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Analitik</h1>
        <p className="text-sm text-muted-foreground mt-1">Performans ve istatistikler</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <span className={`text-xs font-medium ${card.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold text-foreground">
              Son 7 Gün — Randevular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[280px] w-full">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold text-foreground">
              Aylık Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="week" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="patients" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="appointments" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
