import { useState } from "react";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { PatientPanel } from "@/components/dashboard/PatientPanel";

const Index = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("a1b2c3d4-1111-4a7b-b2e1-9c3f4d5a6e7b");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarNav selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} />
      <div className="flex-1 min-w-0">
        <ChatInterface patientId={selectedPatientId} />
      </div>
      <PatientPanel patientId={selectedPatientId} />
    </div>
  );
};

export default Index;
