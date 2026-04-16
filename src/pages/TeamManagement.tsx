import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Users, ShieldAlert, ShieldCheck, Clock, UserCheck, UserX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  admin: { label: "Admin", color: "bg-primary/10 text-primary border-primary/20", icon: ShieldCheck },
  doctor: { label: "Doktor", color: "bg-success/10 text-success border-success/20", icon: UserCheck },
  staff: { label: "Personel", color: "bg-warning/10 text-warning border-warning/20", icon: Users },
  premium: { label: "Premium", color: "bg-primary/10 text-primary border-primary/30", icon: ShieldCheck },
  premium_plus: { label: "Premium+", color: "bg-gradient-to-r from-primary/15 to-purple-500/15 text-primary border-primary/40", icon: ShieldCheck },
  pending: { label: "Onay Bekliyor", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Clock },
};

const TeamManagement = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchMembers() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_team_members");
    if (error) {
      toast.error("Ekip listesi alınamadı: " + error.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    const list: TeamMember[] = (Array.isArray(data) ? data : []).map((r: any) => ({
      user_id: r.user_id,
      full_name: r.full_name,
      username: r.username,
      email: r.email || "",
      role: r.role || "pending",
    }));
    setMembers(list);
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    setUpdating(null);
    if (error) { toast.error("Rol güncellenemedi: " + error.message); return; }
    toast.success("Rol güncellendi!");
    fetchMembers();
  }

  if (roleLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Erişim Reddedildi</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Ekip Yönetimi sayfasına yalnızca admin yetkisine sahip kullanıcılar erişebilir.
        </p>
      </div>
    );
  }

  const pendingMembers = members.filter(m => m.role === "pending");
  const activeMembers = members.filter(m => m.role !== "pending");

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Ekip Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">Kullanıcı rollerini ve onay durumlarını yönetin</p>
      </motion.div>

      {/* Pending Approvals */}
      {pendingMembers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-destructive" />
            <h2 className="text-sm font-display font-bold text-destructive">Onay Bekleyenler ({pendingMembers.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingMembers.map((m, i) => (
              <motion.div key={m.user_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/60">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-destructive">{((m.full_name || m.email || "?")[0] || "?").toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.full_name || m.email || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}{m.username ? ` · @${m.username}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-lg gap-1.5 bg-success hover:bg-success/90 text-white" disabled={updating === m.user_id}
                    onClick={() => handleRoleChange(m.user_id, "staff")}>
                    {updating === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    Onayla
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-lg gap-1.5" disabled={updating === m.user_id}
                    onClick={() => handleRoleChange(m.user_id, "pending")}>
                    <UserX className="w-3.5 h-3.5" /> Reddet
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Active Members */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h2 className="text-sm font-display font-bold text-foreground">Ekip Üyeleri</h2>
          <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{activeMembers.length} üye</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Henüz aktif ekip üyesi yok</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {activeMembers.map((m) => {
              const roleInfo = ROLE_LABELS[m.role] || ROLE_LABELS.pending;
              return (
                <div key={m.user_id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{(m.full_name || "?")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.full_name || "—"}</p>
                    {m.username && <p className="text-xs text-muted-foreground">@{m.username}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] border ${roleInfo.color}`}>{roleInfo.label}</Badge>
                  <Select value={m.role} onValueChange={(v) => handleRoleChange(m.user_id, v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doktor</SelectItem>
                      <SelectItem value="staff">Personel</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="premium_plus">Premium+</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TeamManagement;
