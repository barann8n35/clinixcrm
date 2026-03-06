import { useState } from "react";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { PatientPanel } from "@/components/dashboard/PatientPanel";
import { ActiveChats } from "@/components/dashboard/ActiveChats";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type MobileView = "list" | "chat";

const Messages = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    if (isMobile) setMobileView("chat");
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {mobileView === "list" ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border pl-14">
              <h3 className="text-sm font-semibold text-foreground">Messages</h3>
            </div>
            <ActiveChats selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ChatInterface
              patientId={selectedPatientId}
              onBack={() => setMobileView("list")}
              onInfoClick={() => setDetailsOpen(true)}
              showBackButton
            />
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
              <SheetContent side="right" className="w-[85vw] sm:w-80 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Patient Details</SheetTitle>
                </SheetHeader>
                <PatientPanel patientId={selectedPatientId} />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    );
  }

  // Tablet & Desktop
  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat list */}
      <div className="w-56 border-r border-border flex flex-col bg-card shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Chats</h3>
        </div>
        <ActiveChats selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0">
        <ChatInterface
          patientId={selectedPatientId}
          onBack={isTablet ? () => {} : undefined}
          onInfoClick={isTablet ? () => setDetailsOpen(true) : undefined}
        />
      </div>

      {/* Right panel: visible on desktop, sheet on tablet */}
      {isTablet ? (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Patient Details</SheetTitle>
            </SheetHeader>
            <PatientPanel patientId={selectedPatientId} />
          </SheetContent>
        </Sheet>
      ) : (
        <PatientPanel patientId={selectedPatientId} />
      )}
    </div>
  );
};

export default Messages;
