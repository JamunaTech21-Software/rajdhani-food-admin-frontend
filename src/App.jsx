import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router";

import { applyTheme } from "@shared/theme/applyTheme.js";

import { ConfirmProvider } from "./components/ui/ConfirmDialog.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import { api, restoreSession } from "./lib/api.js";
import { queryClient } from "./lib/queryClient.js";
import { router } from "./routes/router.jsx";

function useBootstrap() {
  useEffect(() => {
    restoreSession();

    // Unauthenticated, so the login screen is branded too. A failure leaves the
    // tokens.css fallback in place rather than an unpainted app.
    api
      .get("/public/layout", { auth: false })
      .then(applyTheme)
      .catch(() => {});
  }, []);
}

export default function App() {
  useBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
