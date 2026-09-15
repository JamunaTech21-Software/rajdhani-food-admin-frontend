import assert from "node:assert/strict";
import { test } from "node:test";

import { hasCapability } from "../src/lib/permissions.js";


// The real SUPER_ADMIN row, copied from a live GET /auth/admin/me on 2026-09-15.
const SUPER_ADMIN = {
  dashboard: "read",
  products: "write",
  content: "write",
  gallery: "write",
  news: "write",
  marketing: "write",
  reviews: "write",
  downloads: "write",
  enquiries: "write",
  dealer_applications: "write",
  contact_messages: "write",
  newsletter: "write",
  settings: "write",
  admin_users: "write",
  audit_log: "read",
  media: "write",
  cache: "write",
};

test("levels are ordered none < read < own < write", () => {
  assert.equal(hasCapability({ media: "write" }, "media", "own"), true);
  assert.equal(hasCapability({ media: "own" }, "media", "read"), true);
  assert.equal(hasCapability({ media: "own" }, "media", "write"), false);
  assert.equal(hasCapability({ media: "read" }, "media", "own"), false);
  assert.equal(hasCapability({ media: "none" }, "media", "read"), false);
});

test("'own' clears read but not write — the Editor media-delete cell", () => {
  const editor = { media: "own" };
  assert.equal(hasCapability(editor, "media", "read"), true, "may open the library");
  assert.equal(hasCapability(editor, "media", "own"), true, "may delete their own uploads");
  assert.equal(hasCapability(editor, "media", "write"), false, "may not delete anyone else's");
});

test("deny by default", () => {
  assert.equal(hasCapability(SUPER_ADMIN, "not_a_capability"), false, "unknown capability");
  assert.equal(hasCapability(undefined, "products"), false, "no permissions object");
  assert.equal(hasCapability(null, "products"), false, "null permissions");
  assert.equal(hasCapability({}, "products"), false, "empty row");
  assert.equal(hasCapability({ products: "superuser" }, "products"), false, "unrecognised level");
});

test("a Super Admin row behaves as §7.3 says", () => {
  assert.equal(hasCapability(SUPER_ADMIN, "settings", "write"), true);
  assert.equal(hasCapability(SUPER_ADMIN, "admin_users", "write"), true);
  assert.equal(hasCapability(SUPER_ADMIN, "audit_log", "read"), true);
  // audit_log is read-only even for a Super Admin — the log is append-only
  assert.equal(hasCapability(SUPER_ADMIN, "audit_log", "write"), false);
});

test("a Sales row cannot reach content areas", () => {
  const sales = {
    dashboard: "read",
    products: "read",
    content: "none",
    enquiries: "write",
    dealer_applications: "write",
    contact_messages: "write",
    newsletter: "write",
    settings: "none",
    admin_users: "none",
  };
  assert.equal(hasCapability(sales, "enquiries", "write"), true);
  assert.equal(hasCapability(sales, "products", "read"), true);
  assert.equal(hasCapability(sales, "products", "write"), false);
  assert.equal(hasCapability(sales, "content", "read"), false);
  assert.equal(hasCapability(sales, "settings", "read"), false);
  assert.equal(hasCapability(sales, "admin_users", "read"), false);
});

