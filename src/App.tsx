import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ActiveClinicProvider } from "@/contexts/ActiveClinicContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Appointments from "./pages/Appointments";
import Patients from "./pages/Patients";
import Analytics from "./pages/Analytics";
import KnowledgeBase from "./pages/KnowledgeBase";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Pipeline from "./pages/Pipeline";
import Campaigns from "./pages/Campaigns";
import CalendarPage from "./pages/CalendarPage";
import Inventory from "./pages/Inventory";
import TeamManagement from "./pages/TeamManagement";
import VideoStudio from "./pages/VideoStudio";
import VoiceAgentPage from "./pages/VoiceAgentPage";
import Pricing from "./pages/Pricing";
import Widget from "./pages/Widget";
import SecurityDashboard from "./pages/SecurityDashboard";
import Scan from "./pages/Scan";
import "@/i18n";
import { useEffect } from "react";
import { initOneSignal } from "@/lib/onesignal";
import { OneSignalClickHandler } from "@/components/OneSignalClickHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

// Initialize OneSignal at app level
const OneSignalInit = () => {
  useEffect(() => {
    initOneSignal();
  }, []);
  return null;
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ActiveClinicProvider>
      <NotificationProvider>
      <OneSignalInit />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OneSignalClickHandler />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/widget" element={<Widget />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="messages" element={<Messages />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="patients" element={<Patients />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="video-studio" element={<VideoStudio />} />
              <Route path="voice-agent" element={<VoiceAgentPage />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="security" element={<SecurityDashboard />} />
              <Route path="scan" element={<Scan />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </NotificationProvider>
      </ActiveClinicProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
