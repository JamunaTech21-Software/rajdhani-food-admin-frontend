import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthStore } from "../stores/authStore.js";

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  // "unknown" means restoreSession() has not answered yet. Redirecting here
  // would bounce an already-signed-in admin to the login screen on every reload.
  if (status === "unknown") {
    return (
      <div className="grid min-h-dvh place-items-center bg-ground" role="status" aria-live="polite">
        <span className="text-sm text-ink-muted">Restoring your session…</span>
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
