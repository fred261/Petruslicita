import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@petrus/shared";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
  allow?: Role[];
}

export function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center text-ink-500">Carregando…</div>;
  }
  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allow && !allow.includes(user.papel)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
