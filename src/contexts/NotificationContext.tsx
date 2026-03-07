import { createContext, useContext, useState, ReactNode } from "react";

type NotificationType = "appointment" | "cancellation" | "message" | "alert";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "1", type: "appointment", title: "Yeni randevu oluşturuldu", description: "Ahmet Yılmaz için 10 Mart 14:00 randevusu eklendi.", time: "5 dk önce", read: false },
  { id: "2", type: "message", title: "Yeni mesaj alındı", description: "Fatma Demir WhatsApp üzerinden mesaj gönderdi.", time: "12 dk önce", read: false },
  { id: "3", type: "cancellation", title: "Randevu iptal edildi", description: "Mehmet Kaya yarınki randevusunu iptal etti.", time: "1 saat önce", read: false },
  { id: "4", type: "alert", title: "Sistem uyarısı", description: "Instagram entegrasyonu yeniden bağlantı gerektiriyor.", time: "2 saat önce", read: true },
  { id: "5", type: "appointment", title: "Randevu hatırlatması", description: "Bugün 3 randevunuz bulunmaktadır.", time: "3 saat önce", read: true },
  { id: "6", type: "message", title: "Okunmamış mesajlar", description: "5 okunmamış mesajınız var.", time: "5 saat önce", read: true },
];

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, toggleRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
