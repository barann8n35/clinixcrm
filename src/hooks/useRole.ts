import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "staff" | "doctor" | "pending";

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

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isDoctor: roles.includes("doctor"),
    isStaff: roles.includes("staff"),
    hasRole: (role: AppRole) => roles.includes(role),
  };
}
