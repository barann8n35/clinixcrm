import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { MobileNavProvider, useMobileNav } from "@/contexts/MobileNavContext";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

function DashboardLayoutInner() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hideHamburger } = useMobileNav();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {!isMobile && <SidebarNav collapsed={isTablet} />}

      {isMobile && !hideHamburger && (
        <>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="fixed top-3 left-3 z-50 p-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/60 shadow-elevated"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
              <div className="relative z-10 w-72 h-full animate-slide-in-right">
                <SidebarNav collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar with notification bell */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-border/60 bg-card/50 backdrop-blur-sm shrink-0">
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <MobileNavProvider>
      <DashboardLayoutInner />
    </MobileNavProvider>
  );
}
