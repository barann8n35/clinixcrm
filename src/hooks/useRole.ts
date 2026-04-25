import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "staff" | "doctor" | "pending" | "premium" | "premium_plus" | "asistan";

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }

    async function fetchRoles() {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      setRoles((data || []).map((r: any) => r.role as AppRole));
      setLoading(false);
    }
    fetchRoles();
  }, [user]);

  const isStaff = roles.includes("staff");
  const isAdmin = roles.includes("admin");

  return {
    roles,
    loading,
    isAdmin,
    isDoctor: roles.includes("doctor"),
    isStaff,
    isAsistan: roles.includes("asistan"),
    isPremium: roles.includes("premium") || roles.includes("premium_plus") || isAdmin,
    isPremiumPlus: roles.includes("premium_plus") || isAdmin,
    // Yetkili: staff dışındaki tüm onaylı roller (genel hatırlatıcı ekleme yetkisi)
    canPostGlobal:
      isAdmin ||
      roles.includes("doctor") ||
      roles.includes("asistan") ||
      roles.includes("premium") ||
      roles.includes("premium_plus"),
    hasRole: (role: AppRole) => roles.includes(role),
  };
}
