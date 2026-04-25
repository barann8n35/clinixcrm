import { motion } from "framer-motion";
import { ShieldCheck, Lock, Users, Activity, AlertTriangle, KeyRound, Database, Fingerprint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const MOCK_LOGS = [
  { id: 1, action: "KVKK Maskeleme Başarılı", details: "n8n AI API çağrısında hasta isimleri maskelendi.", time: "10 dk önce", status: "success" },
  { id: 2, action: "RLS İzolasyon Kontrolü", details: "Doktor Ercan H. kendi yetki alanındaki verilere ulaştı.", time: "1 saat önce", status: "success" },
  { id: 3, action: "Yetkisiz Erişim Engellendi", details: "Geçersiz token ile 'patients' tablosuna erişim denemesi engellendi.", time: "3 saat önce", status: "warning" },
  { id: 4, action: "Veritabanı Yedekleme", details: "Şifrelenmiş günlük veritabanı yedeği alındı.", time: "Dün", status: "success" },
];

const MOCK_METRICS = [
  { title: "Maskelenen Hasta Verisi", value: "1,248", icon: Fingerprint, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { title: "Aktif RLS Kilitleri", value: "6 Tablo", icon: Lock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { title: "İzole Doktor Hesabı", value: "3 Kullanıcı", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "Engellenen API İsteği", value: "24 İhlal", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
];

export default function SecurityDashboard() {
  return (
    <div className="p-4 md:p-8 space-y-8 h-full overflow-auto gradient-mesh">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold">
              Sistem Güvenli
            </Badge>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Security & KVKK Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-tenant izolasyon ve AI veri maskeleme istatistikleri</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2 shadow-sm">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-medium text-foreground">Gerçek Zamanlı İzleme Aktif</span>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_METRICS.map((metric, i) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metric.bg} shrink-0`}>
              <metric.icon className={`w-6 h-6 ${metric.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{metric.title}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight mt-0.5">{metric.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System Status */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Database className="w-32 h-32 text-foreground" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Row Level Security (RLS) Durumu
              </h3>
              
              <div className="space-y-5 relative z-10">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">Hasta Verileri (patients)</span>
                    <span className="text-xs font-bold text-emerald-500">100% İzole</span>
                  </div>
                  <Progress value={100} className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">Mesajlar (messages)</span>
                    <span className="text-xs font-bold text-emerald-500">100% İzole</span>
                  </div>
                  <Progress value={100} className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">Randevular (appointments)</span>
                    <span className="text-xs font-bold text-emerald-500">100% İzole</span>
                  </div>
                  <Progress value={100} className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Security Logs */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="h-full">
            <Card className="p-0 border-border/60 shadow-sm rounded-2xl h-full flex flex-col bg-card">
              <div className="p-4 border-b border-border/60">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Sistem & KVKK Logları
                </h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {MOCK_LOGS.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l-2 border-border pb-4 last:border-0 last:pb-0">
                      <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{log.time}</p>
                      <p className="text-xs font-bold text-foreground mb-1">{log.action}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{log.details}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
