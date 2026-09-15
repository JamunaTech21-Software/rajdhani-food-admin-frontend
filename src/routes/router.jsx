import { createBrowserRouter } from "react-router";

import { DashboardPage } from "../pages/DashboardPage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { RequireCapability } from "./RequireCapability.jsx";

// RTPP-39 hangs the real module routes off the protected branch, each wrapped
// in the RequireCapability its §7.3 row calls for.
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RequireCapability capability="dashboard" />,
        children: [{ path: "/", element: <DashboardPage /> }],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
