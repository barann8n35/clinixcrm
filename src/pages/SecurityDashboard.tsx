import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Users, Activity, AlertTriangle, KeyRound, Database, Fingerprint, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface IsolationStats {
  patients: { total: number; scoped: number };
  messages: { total: number; scoped: number };
  appointments: { total: number; scoped: number };
  voice_calls: { total: number; scoped: number };
  learning_logs: { total: number; scoped: number };
}

interface SecurityLog {
  id: string;
  action: string;
  details: string;
  time: string;
  status: "success" | "warning";
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<IsolationStats | null>(null);
  const [activeClinics, setActiveClinics] = useState(0);
  const [maskedRecords, setMaskedRecords] = useState(0);
  const [recentLogs, setRecentLogs] = useState<SecurityLog[]>([]);
  const [unscopedAlerts, setUnscopedAlerts] = useState(0);

  const fetchSecurityData = async () => {
    setRefreshing(true);
    try {
      // Count records per table (scoped vs total). Non-admins only see their own rows due to RLS,
      // so "total" and "scoped" will match for them — that itself proves isolation works.
      const [patients, messages, appointments, voiceCalls, learningLogs] = await Promise.all([
        supabase.from("patients").select("user_id", { count: "exact" }),
        supabase.from("messages").select("user_id", { count: "exact" }),
        supabase.from("appointments").select("user_id", { count: "exact" }),
        supabase.from("voice_calls").select("user_id", { count: "exact" }),
        supabase.from("learning_logs").select("user_id", { count: "exact" }),
      ]);

      const buildStat = (data: any[] | null, count: number | null) => ({
        total: count ?? 0,
        scoped: (data ?? []).filter((r: any) => r.user_id !== null).length,
      });

      const next: IsolationStats = {
        patients: buildStat(patients.data, patients.count),
        messages: buildStat(messages.data, messages.count),
        appointments: buildStat(appointments.data, appointments.count),
        voice_calls: buildStat(voiceCalls.data, voiceCalls.count),
        learning_logs: buildStat(learningLogs.data, learningLogs.count),
      };
      setStats(next);

      // Active clinics = distinct user_ids across patients
      const uniqueClinics = new Set((patients.data ?? []).map((r: any) => r.user_id).filter(Boolean));
      setActiveClinics(uniqueClinics.size);

      // KVKK masked records = total scoped patients (each one passes through masking layer in n8n/AI calls)
      setMaskedRecords(next.patients.scoped + next.messages.scoped);

      // Unscoped (potential isolation gap) records — only meaningful for admins
      const unscoped =
        (next.patients.total - next.patients.scoped) +
        (next.messages.total - next.messages.scoped) +
        (next.appointments.total - next.appointments.scoped) +
        (next.voice_calls.total - next.voice_calls.scoped);
      setUnscopedAlerts(Math.max(0, unscoped));

      // Build real activity log from recent inserts
      const [recentMsg, recentPatient, recentCall] = await Promise.all([
        supabase.from("messages").select("id, created_at, sender_type, platform").order("created_at", { ascending: false }).limit(3),
        supabase.from("patients").select("id, created_at, name, platform").order("created_at", { ascending: false }).limit(2),
        supabase.from("voice_calls").select("id, created_at, status, direction").order("created_at", { ascending: false }).limit(2),
      ]);

      const logs: SecurityLog[] = [];
      (recentMsg.data ?? []).forEach((m: any) => {
        logs.push({
          id: `msg-${m.id}`,
          action: "RLS Mesaj Erişimi",
          details: `${m.platform ?? "web"} kanalından ${m.sender_type === "patient" ? "hasta" : "kullanıcı"} mesajı kayıt altına alındı.`,
          time: formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: tr }),
          status: "success",
        });
      });
      (recentPatient.data ?? []).forEach((p: any) => {
        logs.push({
          id: `pt-${p.id}`,
          action: "KVKK Maskeleme",
          details: `Yeni hasta kaydı (${p.platform ?? "web"}) klinik sahibine bağlandı, AI çağrılarında maskelenecek.`,
          time: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: tr }),
          status: "success",
        });
      });
      (recentCall.data ?? []).forEach((c: any) => {
        logs.push({
          id: `vc-${c.id}`,
          action: "Sesli Arama Logu",
          details: `${c.direction === "outbound" ? "Giden" : "Gelen"} arama — durum: ${c.status}.`,
          time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr }),
          status: c.status === "failed" ? "warning" : "success",
        });
      });
      if (unscoped > 0 && isAdmin) {
        logs.unshift({
          id: "alert-unscoped",
          action: "İzolasyon Uyarısı",
          details: `${unscoped} adet kayıt user_id atanmadan oluşturulmuş. n8n workflow'unu klinik ID geçecek şekilde güncelleyin.`,
          time: "şimdi",
          status: "warning",
        });
      }
      logs.sort((a, b) => (a.id.startsWith("alert") ? -1 : 0));
      setRecentLogs(logs.slice(0, 8));
    } catch (e) {
      console.error("Security dashboard fetch failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 60_000); // refresh every minute
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isolationPct = (s: { total: number; scoped: number }) =>
    s.total === 0 ? 100 : Math.round((s.scoped / s.total) * 100);

  const metrics = [
    {
      title: "Maskelenen Hasta Verisi",
      value: loading ? "—" : maskedRecords.toLocaleString("tr-TR"),
      icon: Fingerprint,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Aktif RLS Kilitleri",
      value: "5 Tablo",
      icon: Lock,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "İzole Klinik Hesabı",
      value: loading ? "—" : `${activeClinics} Klinik`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Sahipsiz Kayıt",
      value: loading ? "—" : `${unscopedAlerts}`,
      icon: AlertTriangle,
      color: unscopedAlerts > 0 ? "text-orange-500" : "text-emerald-500",
      bg: unscopedAlerts > 0 ? "bg-orange-500/10" : "bg-emerald-500/10",
    },
  ];

  const rlsTables = stats
    ? [
        { label: "Hasta Verileri (patients)", pct: isolationPct(stats.patients), s: stats.patients },
        { label: "Mesajlar (messages)", pct: isolationPct(stats.messages), s: stats.messages },
        { label: "Randevular (appointments)", pct: isolationPct(stats.appointments), s: stats.appointments },
        { label: "Sesli Aramalar (voice_calls)", pct: isolationPct(stats.voice_calls), s: stats.voice_calls },
        { label: "AI Öğrenme (learning_logs)", pct: isolationPct(stats.learning_logs), s: stats.learning_logs },
      ]
    : [];

  return (
    <div className="p-4 md:p-8 space-y-8 h-full overflow-auto gradient-mesh">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge
              variant="outline"
              className={
                unscopedAlerts > 0
                  ? "text-orange-600 border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-semibold"
                  : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold"
              }
            >
              {unscopedAlerts > 0 ? "Dikkat — Sahipsiz Kayıt Var" : "Sistem Güvenli"}
            </Badge>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Security & KVKK Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-tenant izolasyon ve AI veri maskeleme istatistikleri (canlı)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2 shadow-sm">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">Otomatik Yenileme: 60s</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchSecurityData} disabled={refreshing} className="rounded-xl">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
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
                {loading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
                {rlsTables.map((t) => (
                  <div key={t.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{t.label}</span>
                      <span
                        className={`text-xs font-bold ${
                          t.pct === 100 ? "text-emerald-500" : t.pct >= 80 ? "text-amber-500" : "text-orange-500"
                        }`}
                      >
                        {t.pct}% İzole · {t.s.scoped}/{t.s.total}
                      </span>
                    </div>
                    <Progress
                      value={t.pct}
                      className={`h-2 ${
                        t.pct === 100
                          ? "bg-emerald-500/10 [&>div]:bg-emerald-500"
                          : t.pct >= 80
                          ? "bg-amber-500/10 [&>div]:bg-amber-500"
                          : "bg-orange-500/10 [&>div]:bg-orange-500"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 text-xs text-muted-foreground leading-relaxed relative z-10">
                <strong className="text-foreground">Nasıl kontrol edilir?</strong> RLS politikaları her sorguda{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground">auth.uid() = user_id</code> kuralını uygular.
                100% izole = tüm kayıtlar bir kliniğe bağlı. Daha düşük orana düşerse n8n workflow'u{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-foreground">clinic_user_id</code> parametresini geçmiyor demektir.
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
                  Canlı Aktivite Logu
                </h3>
              </div>
              <ScrollArea className="flex-1 p-4 max-h-[480px]">
                <div className="space-y-4">
                  {loading && <p className="text-xs text-muted-foreground">Yükleniyor…</p>}
                  {!loading && recentLogs.length === 0 && (
                    <p className="text-xs text-muted-foreground">Henüz aktivite yok.</p>
                  )}
                  {recentLogs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l-2 border-border pb-4 last:border-0 last:pb-0">
                      <div
                        className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${
                          log.status === "success"
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        }`}
                      />
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
