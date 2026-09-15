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
      { to: "/products", label: "Products", icon: Package, capability: "products", issue: "RTPP-41" },
      { to: "/categories", label: "Categories", icon: Tags, capability: "products", issue: "RTPP-41" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { to: "/banners", label: "Banners", icon: LayoutPanelTop, capability: "content", issue: "RTPP-42" },
      { to: "/page-content", label: "Page content", icon: FileStack, capability: "content", issue: "RTPP-43" },
      { to: "/sections", label: "Sections", icon: Shapes, capability: "marketing", issue: "RTPP-44" },
      { to: "/gallery", label: "Gallery", icon: Images, capability: "gallery", issue: "RTPP-45" },
      { to: "/news", label: "News", icon: Newspaper, capability: "news", issue: "RTPP-46" },
      { to: "/reviews", label: "Reviews", icon: Star, capability: "reviews", issue: "RTPP-47" },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    items: [
      { to: "/enquiries", label: "Enquiries", icon: FileText, capability: "enquiries", issue: "RTPP-48" },
      { to: "/applications", label: "Applications", icon: Handshake, capability: "dealer_applications", issue: "RTPP-48" },
      { to: "/messages", label: "Messages", icon: Mail, capability: "contact_messages", issue: "RTPP-49" },
      { to: "/subscribers", label: "Subscribers", icon: Users, capability: "newsletter", issue: "RTPP-49" },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      { to: "/media", label: "Media library", icon: BookImage, capability: "media", issue: "RTPP-50" },
      { to: "/downloads", label: "Downloads", icon: Download, capability: "downloads", issue: "RTPP-51" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings, capability: "settings", issue: "RTPP-52" },
      { to: "/users", label: "Admin users", icon: UserCog, capability: "admin_users", issue: "RTPP-53" },
      { to: "/audit-logs", label: "Audit log", icon: ScrollText, capability: "audit_log", issue: "RTPP-54" },
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
