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
}

interface NotificationContextType {
  personalNotifications: Notification[];
  globalNotifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  addNotification: (n: Omit<Notification, "id" | "time" | "read"> & { remind_at?: string | null }) => void;
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
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [personalNotifications, setPersonalNotifications] = useState<Notification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const allNotifications = [...personalNotifications, ...globalNotifications];
  const unreadCount = allNotifications.filter((n) => !n.read && !dismissedIds.has(n.id)).length;

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;

    // Fetch personal notifications (user_id = current user)
    const { data: personal } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch global notifications (user_id is null)
    const { data: global } = await supabase
      .from("notifications")
      .select("*")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (personal) setPersonalNotifications(personal.map(mapNotification));
    if (global) setGlobalNotifications(global.map(mapNotification));
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for all notification changes
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = mapNotification(payload.new);
            if (n.user_id && n.user_id === userIdRef.current) {
              setPersonalNotifications((prev) => [n, ...prev]);
            } else if (!n.user_id) {
              setGlobalNotifications((prev) => [n, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = mapNotification(payload.new);
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

  const markAllRead = async () => {
    setPersonalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setGlobalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("user_id", user.id)
        .eq("read", false);
      // For global notifications, we mark them read by updating where user_id is null
      // Note: RLS may prevent this for global notifications - that's okay
    }
  };

  const toggleRead = async (id: string) => {
    const target = allNotifications.find((n) => n.id === id);
    if (!target) return;
    const newRead = !target.read;
    const updateInList = (prev: Notification[]) =>
      prev.map((n) => (n.id === id ? { ...n, read: newRead } : n));
    setPersonalNotifications(updateInList);
    setGlobalNotifications(updateInList);
    await supabase.from("notifications").update({ read: newRead } as any).eq("id", id);
  };

  const dismissNotification = async (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    // Mark as read in DB
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    // Remove from local state after animation delay
    setTimeout(() => {
      setPersonalNotifications((prev) => prev.filter((n) => n.id !== id));
      setGlobalNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  };

  const addNotification = async (n: Omit<Notification, "id" | "time" | "read"> & { remind_at?: string | null }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: n.type,
      title: n.title,
      description: n.description,
      patient_id: n.patient_id || null,
      remind_at: n.remind_at || null,
    } as any);
  };

  return (
    <NotificationContext.Provider value={{ personalNotifications, globalNotifications, unreadCount, markAllRead, toggleRead, dismissNotification, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
