import { createApiClient } from "@shared/api/client.js";

import { API_BASE_URL } from "../config.js";
import { useAuthStore } from "../stores/authStore.js";
import { queryClient } from "./queryClient.js";

// Deliberately a bare fetch, not `api.post`: routing the refresh call through
// the client that intercepts 401s would recurse.
async function requestRotation() {
  const response = await fetch(`${API_BASE_URL}/auth/admin/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  }).catch(() => null);

  if (!response?.ok) return null;

  const session = (await response.json().catch(() => null))?.data;
  if (!session?.tokens?.access_token) return null;

  useAuthStore.getState().setSession(session);
  return session.tokens.access_token;
}

// Module-level single-flight. Refresh rotation revokes the presented token and
// reuse of a spent one revokes the whole family (§7.1), so two concurrent
// rotations would log the admin out. StrictMode double-invoking the bootstrap
// effect is enough to cause exactly that.
let pending = null;

function rotate() {
  pending ??= requestRotation().finally(() => {
    pending = null;
  });
  return pending;
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshSession: rotate,
  onAuthFailure: () => useAuthStore.getState().clear(),
});

/** Boot-time session restore. Leaves `status` as "authenticated" or "anonymous". */
export async function restoreSession() {
  const token = await rotate();
  if (!token) useAuthStore.getState().clear();
  return token;
}

export async function logout() {
  // Unauthenticated by design — a session whose access token already expired
  // must still be able to end itself. The call is what revokes the refresh
  // token server-side; clearing local state alone would leave a usable cookie.
  await api.post("/auth/admin/logout", undefined, { auth: false }).catch(() => null);
  useAuthStore.getState().clear();
  queryClient.clear(); // no previous admin's data may outlive their session
}
