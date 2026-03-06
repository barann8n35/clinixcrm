import { BarChart3, Users, Calendar, MessageSquare } from "lucide-react";

const stats = [
  { label: "Toplam Hasta", value: "1,248", icon: Users, change: "+12%" },
  { label: "Bugünkü Randevu", value: "18", icon: Calendar, change: "+3" },
  { label: "Aktif Sohbet", value: "7", icon: MessageSquare, change: "-2" },
  { label: "Aylık Gelir", value: "₺142K", icon: BarChart3, change: "+8%" },
];

const Dashboard = () => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Kliniğinizin genel durumu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs font-medium text-emerald-500 mb-1">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm">Grafik ve detaylı analizler yakında eklenecek.</p>
      </div>
    </div>
  );
};

export default Dashboard;
