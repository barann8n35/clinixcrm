import { Bell, Plus, CalendarCheck, UserX, MessageSquare, AlertTriangle, Clock, BellRing, UserPlus, CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
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

const urgencyStyles = {
  overdue: { border: "border-l-4 border-l-destructive bg-destructive/5", icon: "text-destructive", bg: "bg-destructive/10", label: "Süresi geçti" },
  soon: { border: "border-l-4 border-l-warning bg-warning/5", icon: "text-warning", bg: "bg-warning/10", label: "Yaklaşıyor" },
};

function sortByUrgency(list: Notification[]) {
  return [...list].sort((a, b) => {
    const ua = getRemindUrgency(a.remind_at);
    const ub = getRemindUrgency(b.remind_at);
    const order = { overdue: 0, soon: 1 };
    const va = ua ? order[ua] : 2;
    const vb = ub ? order[ub] : 2;
    return va - vb;
  });
}

export function NotificationBell() {
  const { personalNotifications, globalNotifications, unreadCount, markAllRead, dismissNotification, addNotification } = useNotifications();
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [showCalendar, setShowCalendar] = useState(false);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const handleAddReminder = () => {
    if (!reminderText.trim()) return;
    let remindAtISO: string | null = null;
    if (reminderDate) {
      const [h, m] = reminderTime.split(":").map(Number);
      const dt = new Date(reminderDate);
      dt.setHours(h, m, 0, 0);
      remindAtISO = dt.toISOString();
    }
    addNotification({
      type: "reminder",
      title: "🔔 Hatırlatıcı",
      description: reminderText,
      remind_at: remindAtISO,
    });
    setReminderText("");
    setReminderDate(undefined);
    setReminderTime("09:00");
    setShowAddReminder(false);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      dismissNotification(id);
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 250);
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.type === "new_registration") {
      navigate("/team");
    }
  };

  const renderNotificationList = (list: Notification[]) => {
    const sorted = sortByUrgency(list);
    if (sorted.length === 0) {
      return (
        <div className="px-4 py-8 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">Bildirim yok</p>
        </div>
      );
    }
    return sorted.slice(0, 25).map((n) => {
      const urgency = getRemindUrgency(n.remind_at);
      const uStyle = urgency ? urgencyStyles[urgency] : null;
      const config = typeConfig[n.type] || typeConfig.alert;
      const Icon = config.icon;
      const iconColor = uStyle ? uStyle.icon : config.color;
      const iconBg = uStyle ? uStyle.bg : config.bg;
      const isDismissing = dismissingIds.has(n.id);

      return (
        <div
          key={n.id}
          onClick={() => handleNotificationClick(n)}
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-250 cursor-pointer hover:bg-accent/50 relative group",
            !n.read && "bg-primary/[0.03]",
            uStyle?.border,
            isDismissing && "opacity-0 max-h-0 py-0 overflow-hidden"
          )}
          style={{ transition: "opacity 250ms, max-height 250ms, padding 250ms" }}
        >
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn("text-[12px] text-foreground truncate", !n.read ? "font-semibold" : "font-medium")}>
                {n.title}
              </p>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              {uStyle && (
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                  urgency === "overdue" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                )}>
                  {uStyle.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
            {n.remind_at && (
              <p className={cn(
                "text-[10px] mt-0.5 flex items-center gap-1",
                urgency === "overdue" ? "text-destructive" : urgency === "soon" ? "text-warning" : "text-muted-foreground"
              )}>
                <Clock className="w-3 h-3" />
                {format(new Date(n.remind_at), "dd MMM yyyy HH:mm", { locale: tr })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 pt-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap group-hover:hidden">{n.time}</span>
            <button
              onClick={(e) => handleDismiss(e, n.id)}
              className="hidden group-hover:flex p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Okundu olarak işaretle ve kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    });
  };

  const personalUnread = personalNotifications.filter((n) => !n.read).length;
  const globalUnread = globalNotifications.filter((n) => !n.read).length;

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
      <PopoverContent align="end" className="w-96 p-0 rounded-2xl shadow-elevated border-border/60">
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
              <button onClick={markAllRead} className="text-[11px] text-primary font-medium hover:underline">
                Tümünü oku
              </button>
            )}
          </div>
        </div>

        {showAddReminder && (
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Yeni Hatırlatıcı</span>
            </div>
            <Input
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="Örn: Yarın MR sonucunu sor"
              className="h-8 text-[12px] rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && handleAddReminder()}
            />
            <div className="flex items-center gap-2">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-[11px] rounded-lg flex-1 justify-start gap-1.5", !reminderDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {reminderDate ? format(reminderDate, "dd MMM yyyy", { locale: tr }) : "Tarih seç"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={(d) => { setReminderDate(d); setShowCalendar(false); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="h-8 px-2 text-[11px] rounded-lg border border-input bg-background w-24"
              />
              <Button size="sm" onClick={handleAddReminder} className="h-8 px-3 rounded-lg text-[11px]">
                Ekle
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/60 bg-transparent h-9 p-0">
            <TabsTrigger value="personal" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[12px] h-9">
              Bana Özel
              {personalUnread > 0 && (
                <span className="ml-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                  {personalUnread}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="global" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[12px] h-9">
              Genel
              {globalUnread > 0 && (
                <span className="ml-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-muted-foreground/20 text-foreground text-[9px] font-bold px-1">
                  {globalUnread}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-0">
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-border/40">
              {renderNotificationList(personalNotifications)}
            </div>
          </TabsContent>
          <TabsContent value="global" className="mt-0">
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-border/40">
              {renderNotificationList(globalNotifications)}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
