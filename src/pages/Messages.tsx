import { useState } from "react";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { PatientPanel } from "@/components/dashboard/PatientPanel";
import { ActiveChats } from "@/components/dashboard/ActiveChats";

const Messages = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b");

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat list */}
      <div className="w-56 border-r border-border flex flex-col bg-card shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Chats</h3>
        </div>
        <ActiveChats selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} />
      </div>
      {/* Chat */}
      <div className="flex-1 min-w-0">
        <ChatInterface patientId={selectedPatientId} />
      </div>
      <PatientPanel patientId={selectedPatientId} />
    </div>
  );
};

export default Messages;
