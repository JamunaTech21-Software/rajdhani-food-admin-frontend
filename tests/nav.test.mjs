import assert from "node:assert/strict";
import { test } from "node:test";

import { NAV_GROUPS, visibleNavGroups } from "../src/components/layout/nav-config.js";


// The three real rows, transcribed from backend/api/app/Auth/RolePolicy.php.
// A capability absent from a row is NONE — deny by default, as the policy says.
const SUPER_ADMIN = {
  dashboard: "read", products: "write", content: "write", gallery: "write", news: "write",
  marketing: "write", reviews: "write", downloads: "write", enquiries: "write",
  dealer_applications: "write", contact_messages: "write", newsletter: "write",
  settings: "write", admin_users: "write", audit_log: "read", media: "write", cache: "write",
};

const EDITOR = {
  dashboard: "read", products: "write", content: "write", gallery: "write", news: "write",
  marketing: "write", reviews: "write", downloads: "write",
  enquiries: "read", dealer_applications: "read", contact_messages: "read",
  media: "own", cache: "write",
};

const SALES = {
  dashboard: "read", products: "read", downloads: "read",
  enquiries: "write", dealer_applications: "write", contact_messages: "write",
  newsletter: "write",
};

const labels = (groups) => groups.flatMap((g) => g.items.map((i) => i.label));
const groupIds = (groups) => groups.map((g) => g.id);

test("every nav item declares a capability the API actually guards", () => {
  // Read off routes/admin.php on 2026-09-15.
  const API_CAPABILITIES = new Set([
    "dashboard", "products", "content", "gallery", "news", "marketing", "reviews",
    "downloads", "enquiries", "dealer_applications", "contact_messages", "newsletter",
    "settings", "admin_users", "audit_log", "media", "cache",
  ]);
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      assert.ok(
        API_CAPABILITIES.has(item.capability),
        `${item.label} declares "${item.capability}", which the API does not know`,
      );
    }
  }
});

test("a Super Admin sees every group and every item", () => {
  const groups = visibleNavGroups(SUPER_ADMIN);
  assert.deepEqual(groupIds(groups), ["overview", "catalogue", "content", "leads", "library", "system"]);
  assert.equal(labels(groups).length, NAV_GROUPS.flatMap((g) => g.items).length);
});

test("an Editor loses System entirely, and Subscribers with it", () => {
  const groups = visibleNavGroups(EDITOR);
  const seen = labels(groups);

  assert.ok(!groupIds(groups).includes("system"), "no settings, users or audit log");
  assert.ok(!seen.includes("Subscribers"), "Editor holds no newsletter capability");
  assert.ok(!seen.includes("Settings"));
  assert.ok(!seen.includes("Admin users"));
  assert.ok(!seen.includes("Audit log"));

  // But keeps all the content work, and sees leads read-only.
  for (const label of ["Products", "Banners", "Sections", "Gallery", "News", "Reviews", "Enquiries", "Messages"]) {
    assert.ok(seen.includes(label), `Editor should see ${label}`);
  }
  // media: "own" clears the read threshold the nav uses.
  assert.ok(seen.includes("Media library"), "own >= read, so the library is reachable");
});

test("Sales sees leads, not content", () => {
  const groups = visibleNavGroups(SALES);
  const seen = labels(groups);

  assert.ok(!groupIds(groups).includes("content"), "no content group at all");
  assert.ok(!groupIds(groups).includes("system"));
  for (const label of ["Banners", "Sections", "Gallery", "News", "Reviews", "Media library"]) {
    assert.ok(!seen.includes(label), `Sales must not see ${label}`);
  }

  for (const label of ["Enquiries", "Applications", "Messages", "Subscribers"]) {
    assert.ok(seen.includes(label), `Sales should see ${label}`);
  }
  // products: "read" and downloads: "read" still surface the screens.
  assert.ok(seen.includes("Products"));
  assert.ok(seen.includes("Downloads"));
});

test("empty groups are dropped, never rendered as a bare heading", () => {
  for (const groups of [visibleNavGroups(EDITOR), visibleNavGroups(SALES), visibleNavGroups({})]) {
    for (const group of groups) {
      assert.ok(group.items.length > 0, `group "${group.id}" rendered with no items`);
    }
  }
});

test("an admin with no permissions at all sees no navigation", () => {
  for (const permissions of [{}, null, undefined]) {
    assert.deepEqual(visibleNavGroups(permissions), [], "deny by default");
  }
});

