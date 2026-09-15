import { lazy } from "react";
import { createBrowserRouter } from "react-router";

import { AcceptInvitePage } from "../pages/AcceptInvitePage.jsx";
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
const BannersPage = named(() => import("../modules/banners/BannersPage.jsx"), "BannersPage");
const PageContentPage = named(() => import("../modules/page-content/PageContentPage.jsx"), "PageContentPage");
const SectionsPage = named(() => import("../modules/sections/SectionsPage.jsx"), "SectionsPage");
const GalleryPage = named(() => import("../modules/gallery/GalleryPage.jsx"), "GalleryPage");
const NewsPage = named(() => import("../modules/news/NewsPage.jsx"), "NewsPage");
const NewsFormPage = named(() => import("../modules/news/NewsFormPage.jsx"), "NewsFormPage");
const ReviewsPage = named(() => import("../modules/reviews/ReviewsPage.jsx"), "ReviewsPage");
const EnquiriesPage = named(() => import("../modules/leads/EnquiriesPage.jsx"), "EnquiriesPage");
const ApplicationsPage = named(() => import("../modules/leads/ApplicationsPage.jsx"), "ApplicationsPage");
const MessagesPage = named(() => import("../modules/messages/MessagesPage.jsx"), "MessagesPage");
const SubscribersPage = named(() => import("../modules/subscribers/SubscribersPage.jsx"), "SubscribersPage");
const MediaLibraryPage = named(() => import("../modules/media/MediaLibraryPage.jsx"), "MediaLibraryPage");
const DownloadsPage = named(() => import("../modules/downloads/DownloadsPage.jsx"), "DownloadsPage");
const SettingsPage = named(() => import("../modules/settings/SettingsPage.jsx"), "SettingsPage");
const AuditLogPage = named(() => import("../modules/audit/AuditLogPage.jsx"), "AuditLogPage");

/**
 * Every module route is wrapped in the capability the API guards it with, so a
 * hand-typed URL is refused by the client too — though the API remains the
 * authority. Screens RTPP-42 onward will replace their placeholder element.
 */
const placeholderRoutes = PLACEHOLDER_ITEMS.map(({ to, label, capability, issue, blockedOn }) => ({
  path: to,
  element: (
    <RequireCapability capability={capability}>
      <ModulePlaceholder label={label} issue={issue} blockedOn={blockedOn} />
    </RequireCapability>
  ),
}));

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  // Public: the invitee has no account yet, so this cannot sit behind the
  // session guard. The 64-character token in the query string is the only
  // credential, and the API validates it.
  { path: "/accept-invite", element: <AcceptInvitePage /> },
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
          {
            element: <RequireCapability capability="content" />,
            children: [
              { path: "/banners", element: <BannersPage /> },
              { path: "/page-content", element: <PageContentPage /> },
            ],
          },
          {
            element: <RequireCapability capability="marketing" />,
            children: [{ path: "/sections", element: <SectionsPage /> }],
          },
          {
            element: <RequireCapability capability="gallery" />,
            children: [{ path: "/gallery", element: <GalleryPage /> }],
          },
          {
            element: <RequireCapability capability="news" />,
            children: [
              { path: "/news", element: <NewsPage /> },
              { path: "/news/new", element: <NewsFormPage /> },
              { path: "/news/:id", element: <NewsFormPage /> },
            ],
          },
          {
            element: <RequireCapability capability="reviews" />,
            children: [{ path: "/reviews", element: <ReviewsPage /> }],
          },
          {
            element: <RequireCapability capability="enquiries" />,
            children: [{ path: "/enquiries", element: <EnquiriesPage /> }],
          },
          {
            element: <RequireCapability capability="dealer_applications" />,
            children: [{ path: "/applications", element: <ApplicationsPage /> }],
          },
          {
            element: <RequireCapability capability="contact_messages" />,
            children: [{ path: "/messages", element: <MessagesPage /> }],
          },
          {
            element: <RequireCapability capability="newsletter" />,
            children: [{ path: "/subscribers", element: <SubscribersPage /> }],
          },
          {
            element: <RequireCapability capability="media" />,
            children: [{ path: "/media", element: <MediaLibraryPage /> }],
          },
          {
            element: <RequireCapability capability="downloads" />,
            children: [{ path: "/downloads", element: <DownloadsPage /> }],
          },
          {
            // §7.3 grants `settings` to Super Admin alone, and the API enforces
            // the same on every endpoint this screen touches.
            element: <RequireCapability capability="settings" minimum="write" />,
            children: [{ path: "/settings", element: <SettingsPage /> }],
          },
          {
            // §7.3 gives this capability as READ and never WRITE, to anyone —
            // a role that could edit its own trail would make it worthless.
            element: <RequireCapability capability="audit_log" />,
            children: [{ path: "/audit-logs", element: <AuditLogPage /> }],
          },
          ...placeholderRoutes,
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
