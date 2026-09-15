import { create } from "zustand";

// §7.2: the access token lives in memory only, never localStorage. A reload
// therefore has no token — restoreSession() trades the HttpOnly refresh cookie
// for a fresh one at boot.
export const useAuthStore = create((set) => ({
  status: "unknown", // unknown | authenticated | anonymous
  accessToken: null,
  admin: null,

  setSession: (session) =>
    set({
      status: "authenticated",
      accessToken: session?.tokens?.access_token ?? null,
      admin: session?.admin ?? null,
    }),

  setAdmin: (admin) => set({ admin }),

  clear: () => set({ status: "anonymous", accessToken: null, admin: null }),
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;

const LEVELS = { none: 0, read: 1, own: 2, write: 3 };

/**
 * Check this admin's row of the §7.3 matrix, as returned by /auth/admin/me.
 * Navigation uses it to hide what a role cannot reach — but the API is the
 * authority, so this must never be the only guard on an action.
 */
export function hasCapability(permissions, capability, minimum = "read") {
  return (LEVELS[permissions?.[capability]] ?? 0) >= (LEVELS[minimum] ?? 0);
}

export const useCan = (capability, minimum = "read") =>
  hasCapability(useAuthStore((s) => s.admin?.permissions), capability, minimum);
