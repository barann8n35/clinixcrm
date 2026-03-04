import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { PatientPanel } from "@/components/dashboard/PatientPanel";

const Index = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarNav />
      <div className="flex-1 min-w-0">
        <ChatInterface />
      </div>
      <PatientPanel />
    </div>
  );
};

export default Index;
