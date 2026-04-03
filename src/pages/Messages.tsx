import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { PatientPanel } from "@/components/dashboard/PatientPanel";
import { ActiveChats } from "@/components/dashboard/ActiveChats";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMobileNav } from "@/contexts/MobileNavContext";
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";

type MobileView = "list" | "chat";

const Messages = () => {
  const { t } = useTranslation();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { setHideHamburger } = useMobileNav();

  useEffect(() => {
    setHideHamburger(isMobile && mobileView === "chat");
    return () => setHideHamburger(false);
  }, [isMobile, mobileView, setHideHamburger]);

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
              <h3 className="text-sm font-semibold text-foreground">{t("inbox.title")}</h3>
            </div>
            <ActiveChats selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {selectedPatientId && (
              <ChatInterface
                patientId={selectedPatientId}
                onBack={() => setMobileView("list")}
                onInfoClick={() => setDetailsOpen(true)}
                showBackButton
              />
            )}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
              <SheetContent side="right" className="w-[85vw] sm:w-80 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Patient Details</SheetTitle>
                </SheetHeader>
                {selectedPatientId && <PatientPanel patientId={selectedPatientId} />}
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
      {/* Left: Header + Chat list */}
      <div className="w-72 border-r border-border flex flex-col bg-card shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <h2 className="text-xl font-display font-bold text-foreground">{t("inbox.title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("inbox.subtitle")}</p>
        </div>
        <ActiveChats selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
      </div>

      {/* Chat or empty state */}
      <div className="flex-1 min-w-0">
        {selectedPatientId ? (
          <ChatInterface
            patientId={selectedPatientId}
            onBack={isTablet ? () => {} : undefined}
            onInfoClick={isTablet ? () => setDetailsOpen(true) : undefined}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <MessageSquare className="w-12 h-12 opacity-30" />
            <p className="text-sm">{t("inbox.selectConversation")}</p>
          </div>
        )}
      </div>

      {/* Right panel */}
      {selectedPatientId && (
        isTablet ? (
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
        )
      )}
    </div>
  );
};

export default Messages;
