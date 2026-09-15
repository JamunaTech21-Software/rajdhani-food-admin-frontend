import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { NAV_ITEMS } from "../src/components/layout/nav-config.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");

const page = read("modules/downloads/DownloadsPage.jsx");
const dialog = read("modules/downloads/DownloadFormDialog.jsx");
const router = read("routes/router.jsx");

test("the Downloads screen is wired, not a placeholder", () => {
  const item = NAV_ITEMS.find((i) => i.to === "/downloads");

  assert.ok(item, "the nav still lists Downloads");
  assert.equal(item.issue, undefined, "an `issue` routes the link to a placeholder instead");
  assert.match(router, /path: "\/downloads", element: <DownloadsPage \/>/);
  assert.match(router, /capability="downloads"/, "guarded by the capability the API guards it with");
});

test("replacing a file patches the existing row rather than recreating it", () => {
  // RTPP-51's first acceptance criterion: the public URL resolves by key, so the
  // only way a replacement keeps the link is by updating the row in place. A
  // delete-then-create would break every link for as long as it took, and would
  // reset the download counter.
  assert.match(dialog, /api\.patch\(`\/admin\/downloads\/\$\{download\.id\}`/);
  assert.doesNotMatch(dialog, /api\.delete\(`\/admin\/downloads/, "saving must never delete");
});

test("the key is locked on an existing download", () => {
  // It is the public contract. Changing it is possible, but never by accident:
  // the field is replaced by the resolved link until it is deliberately unlocked.
  assert.match(dialog, /keyUnlocked/);
  assert.match(dialog, /Change key/);
  assert.match(dialog, /keyChangeWarning/, "and says what a rename costs");
});

test("the file field accepts PDFs, not images", () => {
  assert.match(dialog, /kind="raw"/);
  assert.match(dialog, /resource="documents"/, "the §12 folder for documents");
  assert.match(dialog, /MediaPicker/, "the shared picker, not a second uploader");
});

test("the download counter is visible in the list", () => {
  // The second acceptance criterion is that the counter increments on a public
  // download; an admin can only confirm that if the list shows it.
  assert.match(page, /download_count/);
});

test("write-only controls are hidden from a read-only admin", () => {
  // Sales holds downloads: "read". The API refuses the write either way, but a
  // Delete button that always 403s is a broken screen.
  assert.match(page, /useCan\("downloads", "write"\)/);
  assert.match(page, /canWrite \? \(/);
});
