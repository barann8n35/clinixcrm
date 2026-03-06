import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function DashboardLayout() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop/Tablet sidebar */}
      {!isMobile && <SidebarNav collapsed={isTablet} />}

      {/* Mobile hamburger */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-card"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
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

      <div className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
