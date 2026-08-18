import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAdmin } from "../../hooks/useAdmin";
import { useAuth } from "../../store/AuthProvider";

/**
 * Guards every /admin route. Works in tandem with Firestore security rules:
 * the frontend redirects unauthorised users, and the backend rejects any
 * attempt to read or write admin-only data.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, initialising: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
