import { BarChart3 } from "lucide-react";

const Analytics = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Analitik</h1>
        <p className="text-sm text-muted-foreground mt-1">Performans ve istatistikler</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <BarChart3 className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Analitik paneli yakında burada görüntülenecek.</p>
      </div>
    </div>
  );
};

export default Analytics;
