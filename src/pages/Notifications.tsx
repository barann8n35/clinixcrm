import { Bell, CalendarCheck, UserX, MessageSquare, AlertTriangle, CheckCheck, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";

type NotificationType = Notification["type"];

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  appointment: { icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
  cancellation: { icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
  message: { icon: MessageSquare, color: "text-success", bg: "bg-success/10" },
  alert: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  reminder: { icon: BellRing, color: "text-warning", bg: "bg-warning/10" },
};

const Notifications = () => {
  const { notifications, unreadCount, markAllRead, toggleRead } = useNotifications();

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
