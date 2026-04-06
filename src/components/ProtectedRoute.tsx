import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";
import PendingApproval from "@/pages/PendingApproval";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { roles, loading: roleLoading } = useRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  // If user only has "pending" role, show waiting room
  const hasPending = roles.includes("pending");
  const hasRealRole = roles.some((r) => r === "admin" || r === "staff" || r === "doctor");
  if (hasPending && !hasRealRole) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}
