import { lazy } from "react";
import { createBrowserRouter } from "react-router";

import { AdminLayout } from "../components/layout/AdminLayout.jsx";
import { PLACEHOLDER_ITEMS } from "../components/layout/nav-config.js";
import { LoginPage } from "../pages/LoginPage.jsx";
import { ModulePlaceholder } from "../pages/ModulePlaceholder.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { RequireCapability } from "./RequireCapability.jsx";

// Module screens are split per route: each pulls in heavy libraries (TanStack
// Table, dnd-kit, TipTap, Recharts) that the login screen must never download.
// AdminLayout renders the shared Suspense boundary.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const DashboardPage = named(() => import("../modules/dashboard/DashboardPage.jsx"), "DashboardPage");
const CategoriesPage = named(() => import("../modules/categories/CategoriesPage.jsx"), "CategoriesPage");
const ProductsPage = named(() => import("../modules/products/ProductsPage.jsx"), "ProductsPage");
const ProductFormPage = named(() => import("../modules/products/ProductFormPage.jsx"), "ProductFormPage");

/**
 * Every module route is wrapped in the capability the API guards it with, so a
 * hand-typed URL is refused by the client too — though the API remains the
 * authority. Screens RTPP-42 onward will replace their placeholder element.
 */
const placeholderRoutes = PLACEHOLDER_ITEMS.map(({ to, label, capability, issue }) => ({
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
          {
            element: <RequireCapability capability="products" />,
            children: [
              { path: "/categories", element: <CategoriesPage /> },
              { path: "/products", element: <ProductsPage /> },
              { path: "/products/new", element: <ProductFormPage /> },
              { path: "/products/:id", element: <ProductFormPage /> },
            ],
          },
          ...placeholderRoutes,
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
