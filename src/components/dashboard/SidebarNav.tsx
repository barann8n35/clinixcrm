import { LayoutDashboard, Calendar, Users, MessageSquare, Settings, Bell, BarChart3, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: Calendar, label: "Appointments", path: "/appointments" },
  { icon: Users, label: "Patients", path: "/patients" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Bell, label: "Notifications", path: "/notifications", badge: 3 },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    toast.success("Çıkış yapıldı");
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`flex flex-col h-full bg-card border-r border-border shrink-0 transition-all duration-200 ${collapsed ? "w-16" : "w-72"}`}>
        {/* Logo */}
        <div className={`border-b border-border ${collapsed ? "px-2 py-4 flex justify-center" : "px-5 py-5"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-display font-bold text-sm">C</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-display font-bold text-base text-foreground leading-none">Clinix</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">Clinical CRM</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className={`py-3 space-y-0.5 flex-1 ${collapsed ? "px-1.5" : "px-3"}`}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const btn = (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150
                  ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"}
                  ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div className="relative">{btn}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        {/* User */}
        <div className={`border-t border-border ${collapsed ? "px-2 py-3 flex justify-center" : "px-4 py-3"}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Çıkış Yap</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-primary font-semibold text-xs">
                  {user?.email?.slice(0, 2).toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{user?.email ?? "Kullanıcı"}</p>
                <p className="text-[11px] text-muted-foreground">Secretary</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
