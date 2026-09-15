import { Outlet } from "react-router";

import { ForbiddenPage } from "../pages/ForbiddenPage.jsx";
import { hasCapability, useAuthStore } from "../stores/authStore.js";

/**
 * Gate a route on this admin's row of the §7.3 matrix.
 *
 * This is presentation, not enforcement. The API checks the same matrix on
 * every admin route, and it is the authority — a guard here only spares someone
 * a screen they would be refused anyway. Never rely on it to protect data.
 */
export function RequireCapability({ capability, minimum = "read", children }) {
  const permissions = useAuthStore((s) => s.admin?.permissions);

  if (!hasCapability(permissions, capability, minimum)) return <ForbiddenPage />;

  return children ?? <Outlet />;
}
