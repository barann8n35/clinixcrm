import { LayoutDashboard, Calendar, Users, MessageSquare, Settings, Bell, BarChart3 } from "lucide-react";
import { ActiveChats } from "./ActiveChats";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false },
  { icon: MessageSquare, label: "Messages", active: true },
  { icon: Calendar, label: "Appointments", active: false },
  { icon: Users, label: "Patients", active: false },
  { icon: BarChart3, label: "Analytics", active: false },
  { icon: Bell, label: "Notifications", active: false, badge: 3 },
  { icon: Settings, label: "Settings", active: false },
];

export function SidebarNav() {
  return (
    <aside className="flex flex-col h-full bg-card border-r border-border w-72">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">M</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-foreground leading-none">MedFlow</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Clinical CRM</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
              ${item.active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-5 py-2">
        <div className="h-px bg-border" />
      </div>

      {/* Active Chats */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-5 py-2">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Chats</h3>
        </div>
        <ActiveChats />
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-primary font-semibold text-xs">AY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">Ayşe Yılmaz</p>
            <p className="text-[11px] text-muted-foreground">Secretary</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
