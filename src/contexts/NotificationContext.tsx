import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type NotificationType = "appointment" | "cancellation" | "message" | "alert" | "reminder" | "new_registration";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  patient_id?: string | null;
  created_at?: string;
  remind_at?: string | null;
  user_id?: string | null;
  scope?: "personal" | "global";
}

interface AddNotificationInput
  extends Omit<Notification, "id" | "time" | "read"> {
  remind_at?: string | null;
  scope?: "personal" | "global";
}

interface NotificationContextType {
  personalNotifications: Notification[];
  globalNotifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => Promise<{ ok: boolean; error?: string }>;
  addNotification: (n: AddNotificationInput) => Promise<{ ok: boolean; error?: string }>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  const days = Math.floor(hrs / 24);
  return `${days} gün önce`;
}

function mapNotification(n: any): Notification {
  return {
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    description: n.description || "",
    time: timeAgo(n.created_at),
    read: n.read,
    patient_id: n.patient_id,
    created_at: n.created_at,
    remind_at: n.remind_at,
    user_id: n.user_id,
    scope: (n.scope as "personal" | "global") ?? (n.user_id ? "personal" : "global"),
  };
}

const DISMISSED_KEY = "clinix.dismissedNotificationIds";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}
function saveDismissed(s: Set<string>) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(s))); } catch {}
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [personalNotifications, setPersonalNotifications] = useState<Notification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissed());
  const userIdRef = useRef<string | null>(null);

  const visiblePersonal = personalNotifications.filter((n) => !dismissedIds.has(n.id));
  const visibleGlobal = globalNotifications.filter((n) => !dismissedIds.has(n.id));
  const allVisible = [...visiblePersonal, ...visibleGlobal];
  const unreadCount = allVisible.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;

    const { data: mine } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: legacyGlobal } = await supabase
      .from("notifications")
      .select("*")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const mapped = (mine ?? []).map(mapNotification);
    const legacyMapped = (legacyGlobal ?? []).map(mapNotification);

    setPersonalNotifications(mapped.filter((n) => n.scope === "personal"));
    setGlobalNotifications([
      ...mapped.filter((n) => n.scope === "global"),
      ...legacyMapped,
    ]);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = mapNotification(payload.new);
            if (n.user_id && n.user_id !== userIdRef.current) return;
            if (n.scope === "global") {
              setGlobalNotifications((prev) => [n, ...prev]);
            } else {
              setPersonalNotifications((prev) => [n, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = mapNotification(payload.new);
            if (updated.user_id && updated.user_id !== userIdRef.current) return;
            const updateInList = (prev: Notification[]) =>
              prev.map((item) => (item.id === updated.id ? updated : item));
            setPersonalNotifications(updateInList);
            setGlobalNotifications(updateInList);
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as any).id;
            setPersonalNotifications((prev) => prev.filter((item) => item.id !== id));
            setGlobalNotifications((prev) => prev.filter((item) => item.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const addDismissed = (ids: string[]) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveDismissed(next);
      return next;
    });
  };

  const markAllRead = async () => {
    const unreadIds = allVisible.filter((n) => !n.read).map((n) => n.id);
    setPersonalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setGlobalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", unreadIds);
  };

  const clearAll = async () => {
    const all = [...personalNotifications, ...globalNotifications];
    const deletable = all.filter((n) => n.user_id === userIdRef.current).map((n) => n.id);
    const undeletable = all.filter((n) => n.user_id !== userIdRef.current).map((n) => n.id);

    // Hide everything immediately
    addDismissed(all.map((n) => n.id));
    setPersonalNotifications([]);
    setGlobalNotifications([]);

    if (deletable.length > 0) {
      const { error } = await supabase.from("notifications").delete().in("id", deletable);
      if (error) return { ok: false, error: error.message };
    }
    // Undeletable (legacy global) rows stay in DB but are hidden via localStorage
    return { ok: true };
  };

  const toggleRead = async (id: string) => {
    const target = allVisible.find((n) => n.id === id);
    if (!target) return;
    const newRead = !target.read;
    const updateInList = (prev: Notification[]) =>
      prev.map((n) => (n.id === id ? { ...n, read: newRead } : n));
    setPersonalNotifications(updateInList);
    setGlobalNotifications(updateInList);
    await supabase.from("notifications").update({ read: newRead } as any).eq("id", id);
  };

  const dismissNotification = async (id: string) => {
    const target = [...personalNotifications, ...globalNotifications].find((n) => n.id === id);
    addDismissed([id]);
    setPersonalNotifications((prev) => prev.filter((n) => n.id !== id));
    setGlobalNotifications((prev) => prev.filter((n) => n.id !== id));
    // Try real DB delete if it belongs to the user; otherwise keep only locally hidden
    if (target && target.user_id === userIdRef.current) {
      await supabase.from("notifications").delete().eq("id", id);
    }
  };

  const addNotification = async (
    n: AddNotificationInput,
  ): Promise<{ ok: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Oturum yok" };

    if (n.scope === "global") {
      const { data, error } = await supabase.functions.invoke(
        "post-global-notification",
        {
          body: {
            type: n.type ?? "reminder",
            title: n.title,
            description: n.description,
            patient_id: n.patient_id ?? null,
            remind_at: n.remind_at ?? null,
          },
        },
      );
      if (error) return { ok: false, error: error.message };
      if ((data as any)?.error) return { ok: false, error: (data as any).error };
      return { ok: true };
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: user.id,
      type: n.type,
      title: n.title,
      description: n.description,
      patient_id: n.patient_id || null,
      remind_at: n.remind_at || null,
      scope: "personal",
    } as any);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  return (
    <NotificationContext.Provider value={{ personalNotifications, globalNotifications, unreadCount, markAllRead, toggleRead, dismissNotification, clearAll, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
