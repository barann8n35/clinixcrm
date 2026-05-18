import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface ClinicOption {
  ownerUserId: string;
  ownerName: string;
  memberRole: string; // "self" for own clinic, else clinic_members.member_role
}

interface ActiveClinicContextType {
  options: ClinicOption[];
  activeClinicUserId: string | null;
  setActiveClinicUserId: (uid: string) => void;
  loading: boolean;
  /** True when current user belongs to more than one clinic (incl. own) */
  hasMultiple: boolean;
}

const Ctx = createContext<ActiveClinicContextType>({
  options: [],
  activeClinicUserId: null,
  setActiveClinicUserId: () => {},
  loading: true,
  hasMultiple: false,
});

const STORAGE_KEY = "clinix.activeClinicUserId";

export function ActiveClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [options, setOptions] = useState<ClinicOption[]>([]);
  const [activeClinicUserId, setActiveClinicUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setOptions([]);
      setActiveClinicUserIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Memberships (clinics user belongs to)
    const { data: memberships } = await supabase
      .from("clinic_members" as any)
      .select("owner_user_id, member_role")
      .eq("member_user_id", user.id);

    const memberList = Array.isArray(memberships) ? (memberships as any[]) : [];

    let opts: ClinicOption[] = [];

    if (memberList.length === 0) {
      // No memberships → user works in their own clinic
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      opts = [{
        ownerUserId: user.id,
        ownerName: prof?.full_name || user.email?.split("@")[0] || "Kendi Kliniğim",
        memberRole: "self",
      }];
    } else {
      // Fetch owner profile names
      const ownerIds = memberList.map((m) => m.owner_user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ownerIds);
      const nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      opts = memberList.map((m) => ({
        ownerUserId: m.owner_user_id,
        ownerName: nameMap.get(m.owner_user_id) || "Klinik",
        memberRole: m.member_role,
      }));
    }

    setOptions(opts);

    // Pick active: stored value if still valid, else first option
    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = stored && opts.some((o) => o.ownerUserId === stored) ? stored : null;
    const active = validStored || opts[0]?.ownerUserId || null;
    setActiveClinicUserIdState(active);
    if (active) localStorage.setItem(STORAGE_KEY, active);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setActiveClinicUserId = (uid: string) => {
    setActiveClinicUserIdState(uid);
    localStorage.setItem(STORAGE_KEY, uid);
  };

  return (
    <Ctx.Provider
      value={{
        options,
        activeClinicUserId,
        setActiveClinicUserId,
        loading,
        hasMultiple: options.length > 1,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useActiveClinic() {
  return useContext(Ctx);
}
