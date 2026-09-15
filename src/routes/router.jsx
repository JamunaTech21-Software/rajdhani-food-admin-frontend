import { createBrowserRouter } from "react-router";

import { AdminLayout } from "../components/layout/AdminLayout.jsx";
import { PLACEHOLDER_ITEMS } from "../components/layout/nav-config.js";
import { DashboardPage } from "../modules/dashboard/DashboardPage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { ModulePlaceholder } from "../pages/ModulePlaceholder.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { RequireCapability } from "./RequireCapability.jsx";

/**
 * Every module route is wrapped in the capability the API guards it with, so a
 * hand-typed URL is refused by the client too — though the API remains the
 * authority. Screens RTPP-41 onward will replace their placeholder element.
 */
const moduleRoutes = PLACEHOLDER_ITEMS.map(({ to, label, capability, issue }) => ({
  path: to,
  element: (
    <RequireCapability capability={capability}>
      <ModulePlaceholder label={label} issue={issue} />
    </RequireCapability>
  ),
}));

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: (
              <RequireCapability capability="dashboard">
                <DashboardPage />
              </RequireCapability>
            ),
          },
          ...moduleRoutes,
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
