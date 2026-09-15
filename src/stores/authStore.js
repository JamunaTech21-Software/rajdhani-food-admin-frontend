import { create } from "zustand";

import { hasCapability } from "../lib/permissions.js";

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

export { hasCapability };

/**
 * Navigation uses this to hide what a role cannot reach — but the API checks
 * the same matrix and is the authority, so it must never be the only guard.
 */
export const useCan = (capability, minimum = "read") =>
  hasCapability(useAuthStore((s) => s.admin?.permissions), capability, minimum);
