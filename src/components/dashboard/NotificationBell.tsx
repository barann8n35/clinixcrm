import { Bell, Plus, CalendarCheck, UserX, MessageSquare, AlertTriangle, Clock, BellRing } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/contexts/NotificationContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  appointment: { icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10" },
  cancellation: { icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
  message: { icon: MessageSquare, color: "text-success", bg: "bg-success/10" },
  alert: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  reminder: { icon: BellRing, color: "text-warning", bg: "bg-warning/10" },
};

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, toggleRead, addNotification } = useNotifications();
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderText, setReminderText] = useState("");

  const handleAddReminder = () => {
    if (!reminderText.trim()) return;
    addNotification({
      type: "reminder",
      title: "🔔 Hızlı Hatırlatıcı",
      description: reminderText,
    });
    setReminderText("");
    setShowAddReminder(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse-soft">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-elevated border-border/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <h3 className="text-sm font-display font-bold text-foreground">Bildirimler</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddReminder(!showAddReminder)}
              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary font-medium hover:underline"
              >
                Tümünü oku
              </button>
            )}
          </div>
        </div>

        {showAddReminder && (
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Yeni Hatırlatıcı</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="Örn: Yarın MR sonucunu sor"
                className="h-8 text-[12px] rounded-lg"
                onKeyDown={(e) => e.key === "Enter" && handleAddReminder()}
              />
              <Button size="sm" onClick={handleAddReminder} className="h-8 px-3 rounded-lg text-[11px]">
                Ekle
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Henüz bildirim yok</p>
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const config = typeConfig[n.type] || typeConfig.alert;
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                    !n.read && "bg-primary/[0.03]"
                  )}
                >
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-[12px] text-foreground truncate", !n.read ? "font-semibold" : "font-medium")}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 pt-1">{n.time}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
