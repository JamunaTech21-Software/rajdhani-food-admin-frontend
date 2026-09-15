import { Navigate, useLocation } from "react-router";

import { useAuthStore } from "../stores/authStore.js";

// Placeholder shell only. The credential form, throttle handling and
// forgot-password flow are RTPP-38.
export function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "authenticated") {
    return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-card">
        <p className="text-eyebrow uppercase text-brand">Rajdhani Food Products</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Admin sign in</h1>
        <p className="mt-3 text-sm text-ink-muted">
          The sign-in form is delivered by RTPP-38. The application shell, session handling and
          protected routing are in place.
        </p>
        <div className="mt-6 h-1 w-12 rounded-full bg-gold" />
      </div>
    </main>
  );
}
