import { useState } from "react";
import { Bell, CalendarCheck, UserX, MessageSquare, AlertTriangle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NotificationType = "appointment" | "cancellation" | "message" | "alert";

interface Notification {
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

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  appointment: { icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
  cancellation: { icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
  message: { icon: MessageSquare, color: "text-success", bg: "bg-success/10" },
  alert: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
};

const Notifications = () => {
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
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bildirimler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Tümünü okundu işaretle
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;

          return (
            <button
              key={notification.id}
              onClick={() => toggleRead(notification.id)}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors",
                notification.read
                  ? "bg-card border-border hover:bg-muted/50"
                  : "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]"
              )}
            >
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-medium text-foreground", !notification.read && "font-semibold")}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <Badge variant="default" className="h-5 text-[10px] px-1.5 bg-primary text-primary-foreground">
                      Yeni
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{notification.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                {notification.time}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
