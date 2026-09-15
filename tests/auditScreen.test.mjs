import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { NAV_ITEMS, PLACEHOLDER_ITEMS } from "../src/components/layout/nav-config.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");

const page = read("modules/audit/AuditLogPage.jsx");
const panel = read("modules/audit/DiffPanel.jsx");
const router = read("routes/router.jsx");

test("the Audit log screen is wired, not a placeholder", () => {
  const item = NAV_ITEMS.find((i) => i.to === "/audit-logs");

  assert.ok(item, "the nav still lists it");
  assert.equal(item.issue, undefined);
  assert.ok(!PLACEHOLDER_ITEMS.some((i) => i.to === "/audit-logs"));
  assert.match(router, /path: "\/audit-logs", element: <AuditLogPage \/>/);
});

test("the trail is read-only — nothing here writes to it", () => {
  // §7.3 grants audit_log as READ and never WRITE, to any role: an actor who
  // could edit their own trail would make it worthless as evidence.
  assert.match(router, /capability="audit_log"/);
  assert.doesNotMatch(router, /capability="audit_log" minimum="write"/);

  for (const method of ["post", "patch", "put", "delete"]) {
    assert.doesNotMatch(
      page,
      new RegExp(`api\\.${method}\\([^)]*audit`),
      `the screen must never ${method} to the audit trail`,
    );
  }
});

test("all four filters the endpoint accepts are sent", () => {
  // actor, action, resource, from, to — plus paging.
  for (const param of ["resource:", "action:", "actor:", "from:", "to:", "page,", "limit:"]) {
    assert.ok(page.includes(param), `the query never sends ${param}`);
  }
});

test("an empty filter is omitted rather than sent blank", () => {
  // The client drops undefined params; sending `actor=` would filter to an
  // admin whose id is the empty string and return nothing.
  assert.match(page, /resource: filters\.resource \|\| undefined/);
  assert.match(page, /actor: filters\.actor \|\| undefined/);
});

test("pagination is server-side", () => {
  // §11 requires it, and a client-side page over 25 rows of a table with
  // thousands would silently only ever search the first page.
  assert.match(page, /<Pagination meta=\{data\?\.meta\}/);
  assert.match(page, /api\.list\("\/admin\/audit-logs", \{ params \}\)/);
});

test("changing a filter returns to page one", () => {
  // Page 3 of the old result set is meaningless against a new filter, and
  // usually shows an empty page that reads as "no matches".
  assert.match(page, /setPage\(1\)/);
});

test("the diff renders fields, not a JSON blob", () => {
  // RTPP-54 asks for "a readable form, not raw JSON blobs" explicitly.
  assert.doesNotMatch(panel, /JSON\.stringify/);
  assert.match(panel, /diffRows\(entry\)/);
  assert.match(panel, /<dl/, "a description list — field names against values");
});

test("a create and a delete render one column, not a misleading pair", () => {
  // "Not set → x" on every field of a new row reads as though something was
  // overwritten. Only an update has two sides worth comparing.
  assert.match(panel, /const single = kind !== CHANGE_KIND\.UPDATE/);
  assert.match(panel, /single \? \(/);
});

test("a row with no recorded diff cannot be expanded into an empty panel", () => {
  assert.match(page, /const expandable = hasDiff\(entry\)/);
  assert.match(page, /disabled=\{!expandable\}/);
});

test("a deleted admin is still shown as someone", () => {
  // admin_name is null once the account is removed; the trail outlives them.
  assert.match(page, /entry\.admin_name \?\? <span className="italic">A removed admin<\/span>/);
});

test("the actor filter says where its list comes from", () => {
  // There is no endpoint listing admins — /admin/users does not exist — so the
  // options are whatever is on screen. The screen must not imply otherwise.
  assert.match(page, /Admins seen in these results/);
  assert.match(page, /RTPP-53/, "and the comment records why it is limited");
});

test("the action filter is disabled until a resource is chosen", () => {
  // `action` is matched exactly against `resource.verb`, so a verb alone is not
  // a filter the endpoint can express. Offering it would return nothing.
  assert.match(page, /disabled=\{!filters\.resource\}/);
  assert.match(page, /Pick a resource first/);
});
