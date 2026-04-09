import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(
        data.map((n: any) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          description: n.description || "",
          time: timeAgo(n.created_at),
          read: n.read,
          patient_id: n.patient_id,
          created_at: n.created_at,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => [
            {
              id: n.id,
              type: n.type as NotificationType,
              title: n.title,
              description: n.description || "",
              time: timeAgo(n.created_at),
              read: n.read,
              patient_id: n.patient_id,
              created_at: n.created_at,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    }
  };

  const toggleRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const newRead = !target.read;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: newRead } : n))
    );
    await supabase.from("notifications").update({ read: newRead }).eq("id", id);
  };

  const addNotification = async (n: Omit<Notification, "id" | "time" | "read">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: n.type,
      title: n.title,
      description: n.description,
      patient_id: n.patient_id || null,
    });
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, toggleRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
