import {
  BookImage,
  Download,
  FileStack,
  FileText,
  Gauge,
  Handshake,
  Images,
  LayoutPanelTop,
  Mail,
  Newspaper,
  Package,
  ScrollText,
  Settings,
  Shapes,
  Star,
  Tags,
  UserCog,
  Users,
} from "lucide-react";

import { hasCapability } from "../../lib/permissions.js";

/**
 * The dashboard navigation, as data.
 *
 * `capability` on each item is the one the **API** guards that route group with,
 * read off `routes/admin.php` rather than guessed — so a hidden link and a 403
 * can never disagree. Note that §11's "Sections" module (feature items, process
 * steps, stat counters, certifications, testimonials) is guarded by `marketing`,
 * not `content`.
 *
 * `issue` records which RTPP delivers the screen; everything not yet built
 * routes to a placeholder so the navigation is honest about what exists.
 */
export const NAV_GROUPS = [
  {
    id: "overview",
    items: [{ to: "/", label: "Dashboard", icon: Gauge, capability: "dashboard", end: true }],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    items: [
      { to: "/products", label: "Products", icon: Package, capability: "products" },
      { to: "/categories", label: "Categories", icon: Tags, capability: "products" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { to: "/banners", label: "Banners", icon: LayoutPanelTop, capability: "content" },
      { to: "/page-content", label: "Page content", icon: FileStack, capability: "content" },
      { to: "/sections", label: "Sections", icon: Shapes, capability: "marketing" },
      { to: "/gallery", label: "Gallery", icon: Images, capability: "gallery" },
      { to: "/news", label: "News", icon: Newspaper, capability: "news" },
      { to: "/reviews", label: "Reviews", icon: Star, capability: "reviews" },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      { to: "/enquiries", label: "Enquiries", icon: FileText, capability: "enquiries" },
      { to: "/applications", label: "Applications", icon: Handshake, capability: "dealer_applications" },
      // `badgeKey` reads a count from GET /admin/dashboard/summary. Only unread
      // messages carry one: a badge on everything is a badge on nothing.
      {
        to: "/messages",
        label: "Messages",
        icon: Mail,
        capability: "contact_messages",
        badgeKey: "unread_messages",
      },
      { to: "/subscribers", label: "Subscribers", icon: Users, capability: "newsletter" },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      { to: "/media", label: "Media library", icon: BookImage, capability: "media" },
      { to: "/downloads", label: "Downloads", icon: Download, capability: "downloads" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings, capability: "settings" },
      {
        to: "/users",
        label: "Admin users",
        icon: UserCog,
        capability: "admin_users",
        issue: "RTPP-53",
        // The invite-acceptance half of RTPP-53 is built and live at
        // /accept-invite. This half cannot be: `/admin/users` returns
        // "No route matches this path", so there is nothing to list, invite
        // through, or deactivate against. Verified 2026-09-15.
        blockedOn: "the /admin/users endpoints, which the API does not expose yet",
      },
      { to: "/audit-logs", label: "Audit log", icon: ScrollText, capability: "audit_log" },
    ],
  },
];

/** Flat list, for route generation. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

/** Screens not yet built, which route to a placeholder rather than a 404. */
export const PLACEHOLDER_ITEMS = NAV_ITEMS.filter((item) => item.issue);

/**
 * The groups this admin may actually reach, with empty groups dropped so a role
 * never sees a "Leads" heading with nothing under it.
 */
export function visibleNavGroups(permissions) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasCapability(permissions, item.capability)),
  })).filter((group) => group.items.length > 0);
}
