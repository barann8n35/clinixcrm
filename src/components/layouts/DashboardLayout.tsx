import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/components/dashboard/SidebarNav";

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarNav />
      <div className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
