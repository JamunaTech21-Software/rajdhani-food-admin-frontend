import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@shared/api/errors.js";

// Retrying these just delays the error the user needs to see: the request was
// understood and refused, so the same request will be refused again.
const TERMINAL = new Set([400, 401, 403, 404, 409, 422]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        !(error instanceof ApiError && TERMINAL.has(error.status)) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});
