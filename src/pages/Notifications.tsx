import { Bell, CalendarCheck, UserX, MessageSquare, AlertTriangle, CheckCheck, BellRing, UserPlus, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type NotificationType = Notification["type"];

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  appointment: { icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
  cancellation: { icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
  message: { icon: MessageSquare, color: "text-success", bg: "bg-success/10" },
  alert: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  reminder: { icon: BellRing, color: "text-warning", bg: "bg-warning/10" },
  new_registration: { icon: UserPlus, color: "text-primary", bg: "bg-primary/10" },
};

function getRemindUrgency(remind_at?: string | null): "overdue" | "soon" | null {
  if (!remind_at) return null;
  const diff = new Date(remind_at).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 2 * 60 * 60 * 1000) return "soon";
  return null;
}

const Notifications = () => {
  const { personalNotifications, globalNotifications, unreadCount, markAllRead, toggleRead, clearAll } = useNotifications();
  const notifications = [...personalNotifications, ...globalNotifications];

  const sorted = [...notifications].sort((a, b) => {
    const ua = getRemindUrgency(a.remind_at);
    const ub = getRemindUrgency(b.remind_at);
    const order = { overdue: 0, soon: 1 };
    const va = ua ? order[ua] : 2;
    const vb = ub ? order[ub] : 2;
    return va - vb;
  });

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm(`${notifications.length} bildirimi silmek istiyor musunuz?`)) return;
    const res = await clearAll();
    if (res.ok) toast.success("Tüm bildirimler temizlendi");
    else toast.error(res.error || "Temizlenemedi");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bildirimler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Tümünü okundu işaretle
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Tümünü temizle
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((notification) => {
          const urgency = getRemindUrgency(notification.remind_at);
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          const iconColor = urgency === "overdue" ? "text-destructive" : urgency === "soon" ? "text-warning" : config.color;
          const iconBg = urgency === "overdue" ? "bg-destructive/10" : urgency === "soon" ? "bg-warning/10" : config.bg;

          return (
            <button
              key={notification.id}
              onClick={() => toggleRead(notification.id)}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors",
                notification.read
                  ? "bg-card border-border hover:bg-muted/50"
                  : "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]",
                urgency === "overdue" && "border-l-4 border-l-destructive bg-destructive/5",
                urgency === "soon" && "border-l-4 border-l-warning bg-warning/5"
              )}
            >
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("h-5 w-5", iconColor)} />
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
                  {urgency === "overdue" && (
                    <Badge className="h-5 text-[10px] px-1.5 bg-destructive/15 text-destructive border-0">Süresi geçti</Badge>
                  )}
                  {urgency === "soon" && (
                    <Badge className="h-5 text-[10px] px-1.5 bg-warning/15 text-warning border-0">Yaklaşıyor</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{notification.description}</p>
                {notification.remind_at && (
                  <p className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    urgency === "overdue" ? "text-destructive" : urgency === "soon" ? "text-warning" : "text-muted-foreground"
                  )}>
                    <Clock className="w-3 h-3" />
                    {format(new Date(notification.remind_at), "dd MMM yyyy HH:mm", { locale: tr })}
                  </p>
                )}
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
