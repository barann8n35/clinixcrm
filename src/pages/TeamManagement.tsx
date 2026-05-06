import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Users, ShieldAlert, ShieldCheck, Clock, UserCheck, UserX, Loader2, Sparkles, Zap, Package, Trash2 } from "lucide-react";
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
  asistan: { label: "Asistan", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: UserCheck },
  premium: { label: "Premium", color: "bg-primary/10 text-primary border-primary/30", icon: ShieldCheck },
  premium_plus: { label: "Premium+", color: "bg-gradient-to-r from-primary/15 to-purple-500/15 text-primary border-primary/40", icon: ShieldCheck },
  pending: { label: "Onay Bekliyor", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Clock },
};

// Paket meta — admin haricinde görünür/atanabilir paketler
const PACKAGE_META: Record<"standard" | "premium" | "premium_plus", {
  label: string;
  short: string;
  color: string;
  ring: string;
  icon: typeof Sparkles;
}> = {
  standard: {
    label: "Standart",
    short: "STD",
    color: "bg-muted text-muted-foreground border-border",
    ring: "ring-border",
    icon: Package,
  },
  premium: {
    label: "Premium",
    short: "PRM",
    color: "bg-primary/10 text-primary border-primary/30",
    ring: "ring-primary/40",
    icon: Sparkles,
  },
  premium_plus: {
    label: "Premium+ VIP",
    short: "VIP",
    color: "bg-gradient-to-r from-primary/15 to-purple-500/15 text-primary border-primary/40",
    ring: "ring-primary/40",
    icon: Zap,
  },
};

const PRIMARY_ADMIN_EMAIL = "baran@clinix.com";
const PREMIUM_ROLE_OPTIONS = new Set(["premium", "premium_plus"]);

// Rolden paket çıkar
function rolePackage(role: string): "standard" | "premium" | "premium_plus" | null {
  if (role === "premium_plus" || role === "admin") return "premium_plus";
  if (role === "premium") return "premium";
  if (role === "doctor" || role === "asistan" || role === "staff") return "standard";
  return null;
}

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

  async function handleRoleChange(member: TeamMember, newRole: string) {
    const normalizedEmail = member.email.trim().toLowerCase();
    const isPrimaryAdmin = normalizedEmail === PRIMARY_ADMIN_EMAIL;
    const isCurrentAdmin = member.role === "admin";
    const isPremiumTarget = PREMIUM_ROLE_OPTIONS.has(newRole);

    if (isPrimaryAdmin && newRole !== "admin") {
      toast.error("Ana admin hesabı her zaman admin kalmalıdır.");
      return;
    }

    if (isCurrentAdmin && isPremiumTarget) {
      toast.info("Admin rolü zaten tüm Premium+ özelliklerini açar.");
      return;
    }

    setUpdating(member.user_id);

    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", member.user_id);

    if (deleteError) {
      setUpdating(null);
      toast.error("Eski rol kaldırılamadı: " + deleteError.message);
      return;
    }

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: member.user_id, role: newRole as any });

    if (insertError) {
      await supabase
        .from("user_roles")
        .insert({ user_id: member.user_id, role: member.role as any });

      setUpdating(null);
      toast.error("Rol güncellenemedi: " + insertError.message);
      return;
    }

    setUpdating(null);
    toast.success("Rol güncellendi!");
    fetchMembers();
  }

  // Paket ata: Standart -> staff, Premium -> premium, Premium+ -> premium_plus
  // İlgili kullanıcının base rolünü korumaya çalışmıyoruz çünkü single-role tablomuz var.
  // Doktor / asistan gibi özel roller değiştirilmez (sadece Standart paket sayılırlar).
  async function assignPackage(member: TeamMember, pkg: "standard" | "premium" | "premium_plus") {
    let targetRole = "staff";
    if (pkg === "premium") targetRole = "premium";
    else if (pkg === "premium_plus") targetRole = "premium_plus";
    else {
      // standard => mevcut rol doctor/asistan/staff/pending ise koru, yoksa staff
      if (member.role === "doctor" || member.role === "asistan" || member.role === "staff") {
        targetRole = member.role;
      } else {
        targetRole = "staff";
      }
    }
    if (targetRole === member.role) {
      toast.info("Bu paket zaten atanmış.");
      return;
    }
    await handleRoleChange(member, targetRole);
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

  // Özet sayım
  const counts = {
    standard: activeMembers.filter(m => rolePackage(m.role) === "standard").length,
    premium: activeMembers.filter(m => rolePackage(m.role) === "premium").length,
    premium_plus: activeMembers.filter(m => rolePackage(m.role) === "premium_plus").length,
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Ekip Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">Kullanıcı rollerini ve paket atamalarını yönetin</p>
      </motion.div>

      {/* Package Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3"
      >
        {(["standard", "premium", "premium_plus"] as const).map((pkg) => {
          const meta = PACKAGE_META[pkg];
          const Icon = meta.icon;
          return (
            <div
              key={pkg}
              className={`rounded-xl border p-4 bg-card ${meta.color.replace(/bg-\S+/g, "").trim()} border-border/60`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                </div>
                <span className="text-2xl font-display font-extrabold text-foreground">{counts[pkg]}</span>
              </div>
            </div>
          );
        })}
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
                    onClick={() => handleRoleChange(m, "staff")}>
                    {updating === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    Onayla (Standart)
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-lg gap-1.5" disabled={updating === m.user_id}
                    onClick={() => handleRoleChange(m, "pending")}>
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
              const isPrimaryAdmin = m.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
              const isAdminMember = m.role === "admin";
              const lockRoleChange = isPrimaryAdmin && isAdminMember;
              const currentPackage = rolePackage(m.role);
              const pkgMeta = currentPackage ? PACKAGE_META[currentPackage] : null;
              const PkgIcon = pkgMeta?.icon ?? Package;
              const isUpdating = updating === m.user_id;

              return (
                <div key={m.user_id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                    {/* Avatar + Identity */}
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{((m.full_name || m.email || "?")[0] || "?").toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.full_name || m.email || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}{m.username ? ` · @${m.username}` : ""}</p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] border ${roleInfo.color}`}>{roleInfo.label}</Badge>
                    </div>

                    {/* Package indicator + quick assign */}
                    <div className="flex items-center gap-2 shrink-0">
                      {pkgMeta && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${pkgMeta.color}`}>
                          <PkgIcon className="w-3 h-3" />
                          {pkgMeta.short}
                        </div>
                      )}

                      {!isAdminMember && (
                        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                          {(["standard", "premium", "premium_plus"] as const).map((pkg) => {
                            const meta = PACKAGE_META[pkg];
                            const isActive = currentPackage === pkg;
                            return (
                              <button
                                key={pkg}
                                disabled={isUpdating || lockRoleChange}
                                onClick={() => assignPackage(m, pkg)}
                                title={`${meta.label} paketine ata`}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                  isActive
                                    ? `${meta.color} shadow-sm scale-105`
                                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {meta.short}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Detail role select */}
                    <Select value={m.role} onValueChange={(v) => handleRoleChange(m, v)} disabled={lockRoleChange || isUpdating}>
                      <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="doctor">Doktor</SelectItem>
                        <SelectItem value="staff">Personel</SelectItem>
                        <SelectItem value="asistan">Asistan</SelectItem>
                        {!isAdminMember && <SelectItem value="premium">Premium</SelectItem>}
                        {!isAdminMember && <SelectItem value="premium_plus">Premium+</SelectItem>}
                        <SelectItem value="pending">Beklemede</SelectItem>
                      </SelectContent>
                    </Select>

                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                    {lockRoleChange && (
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">Ana admin</span>
                    )}
                  </div>
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
