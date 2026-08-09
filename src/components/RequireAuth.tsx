import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, isConfigured } = useAuth();

  if (!isConfigured) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-hidden>
        <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
