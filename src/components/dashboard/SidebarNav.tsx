import { LayoutDashboard, Inbox, GitBranch, Users, Calendar, BookOpen, Settings, LogOut, Globe, Megaphone, CalendarDays, Package, UsersRound } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const mainNavItems = [
  { icon: LayoutDashboard, labelKey: "sidebar.dashboard", path: "/dashboard" },
  { icon: Inbox, labelKey: "sidebar.inbox", path: "/messages" },
  { icon: GitBranch, labelKey: "sidebar.pipeline", path: "/pipeline" },
  { icon: Users, labelKey: "sidebar.patients", path: "/patients" },
  { icon: Calendar, labelKey: "sidebar.appointments", path: "/appointments" },
  { icon: CalendarDays, labelKey: "sidebar.calendar", path: "/calendar" },
  { icon: Megaphone, labelKey: "sidebar.campaigns", path: "/campaigns" },
];

const managementNavItems = [
  { icon: Package, labelKey: "sidebar.inventory", path: "/inventory" },
  { icon: UsersRound, labelKey: "sidebar.team", path: "/team" },
  { icon: BookOpen, labelKey: "sidebar.knowledgeBase", path: "/knowledge-base" },
  { icon: Settings, labelKey: "sidebar.settings", path: "/settings" },
];

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    toast.success(t("sidebar.logout"));
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "tr" ? "en" : "tr");
  };

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const isActive = location.pathname.startsWith(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNav(item.path)}
        className={`w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150
          ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
          ${isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{t(item.labelKey)}</span>}
      </button>
    );
  };

  return (
    <aside className={`flex flex-col h-full bg-sidebar shrink-0 transition-all duration-200 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo */}
      <div className={`${collapsed ? "px-2 py-5 flex justify-center" : "px-5 py-5"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-display font-bold text-sm">C</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display font-bold text-base text-sidebar-foreground leading-none">Clinix</h1>
              <p className="text-[11px] text-sidebar-muted mt-0.5">Medical CRM</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className={`flex-1 ${collapsed ? "px-1.5" : "px-3"}`}>
        {!collapsed && (
          <p className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-group-label">
            {t("sidebar.mainMenu")}
          </p>
        )}
        <div className="space-y-0.5">
          {mainNavItems.map(renderNavItem)}
        </div>

        {!collapsed && (
          <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-group-label">
            {t("sidebar.management")}
          </p>
        )}
        {collapsed && <div className="my-4 mx-2 h-px bg-sidebar-border" />}
        <div className="space-y-0.5">
          {managementNavItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Language Toggle */}
      <div className={`${collapsed ? "px-2 py-2 flex justify-center" : "px-4 py-2"}`}>
        <button
          onClick={toggleLang}
          className={`flex items-center gap-2 rounded-lg text-[12px] font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors
            ${collapsed ? "p-2" : "px-3 py-2 w-full"}`}
        >
          <Globe className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <span>{i18n.language === "tr" ? "TR / EN" : "EN / TR"}</span>
          )}
        </button>
      </div>

      {/* User / Logout */}
      <div className={`border-t border-sidebar-border ${collapsed ? "px-2 py-3 flex justify-center" : "px-4 py-3"}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sidebar-foreground font-semibold text-xs">
                {user?.email?.slice(0, 2).toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-sidebar-foreground truncate">{user?.email ?? t("sidebar.notLoggedIn")}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-destructive transition-colors"
              title={t("sidebar.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
