import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "../src/shared/api/errors.js";
import { conflictTables, describeUsage, isInUse } from "../src/modules/media/usage.js";
import { folderLabel, folderPath, formatSize, rejectionReason } from "../src/modules/media/folders.js";

test("usage reads as a sentence an editor can act on", () => {
  // GET /admin/media/{id} returns usage proactively, so the warning appears
  // before a delete is attempted rather than only explaining the 409 after.
  assert.equal(
    describeUsage([
      { table: "categories", count: 2, label: "category image(s)" },
      { table: "banners", count: 1, label: "banner(s)" },
    ]),
    "2 category image(s), 1 banner(s)",
  );
});

test("an unused asset reads as nothing, not an empty string", () => {
  assert.equal(describeUsage([]), null);
  assert.equal(describeUsage(), null);
  assert.equal(isInUse({ usage: [] }), false);
  assert.equal(isInUse({}), false);
  assert.equal(isInUse(null), false);
  assert.equal(isInUse({ usage: [{ table: "products", count: 1, label: "product image(s)" }] }), true);
});

test("a 409 names exactly what is using the asset", () => {
  // RTPP-50's first acceptance criterion: the editor is told what is using it.
  // The API puts the referencing table name in each detail's `field`.
  const conflict = new ApiError({
    code: "CONFLICT",
    message: "Still referenced",
    status: 409,
    details: [
      { field: "categories", message: "2 rows" },
      { field: "banners", message: "1 row" },
    ],
  });

  assert.deepEqual(conflictTables(conflict), ["categories", "banners"]);
});

test("any other error yields no table list, so it falls through to a toast", () => {
  const notFound = new ApiError({ code: "NOT_FOUND", status: 404 });
  const server = new ApiError({ code: "INTERNAL_ERROR", status: 500 });

  assert.deepEqual(conflictTables(notFound), []);
  assert.deepEqual(conflictTables(server), []);
  assert.deepEqual(conflictTables(new Error("network")), []);
  assert.deepEqual(conflictTables(null), []);
});

test("a 409 with no details does not claim an empty list of dependents", () => {
  const bare = new ApiError({ code: "CONFLICT", status: 409 });
  assert.deepEqual(conflictTables(bare), [], "falls through to the generic message");
});

test("folders follow the rajdhani/{resource} convention", () => {
  assert.equal(folderPath("products"), "rajdhani/products");
  assert.equal(folderLabel("rajdhani/certifications"), "Certifications");
  assert.equal(folderLabel("rajdhani/unknown"), "rajdhani/unknown", "unknown folders still name themselves");
  assert.equal(folderLabel(null), "Uncategorised");
});

test("files are screened against the §12 limits before an upload is spent", () => {
  const file = (type, size) => ({ type, size });

  assert.equal(rejectionReason(file("image/jpeg", 1024)), null);
  assert.equal(rejectionReason(file("image/svg+xml", 1024)), null, "SVG is allowed for logos");
  assert.match(rejectionReason(file("image/gif", 1024)), /JPG, PNG, WebP or SVG/);
  assert.match(rejectionReason(file("image/jpeg", 6 * 1024 * 1024)), /5 MB limit/);

  // Documents are a different type and a different ceiling.
  assert.equal(rejectionReason(file("application/pdf", 1024), "raw"), null);
  assert.match(rejectionReason(file("image/jpeg", 1024), "raw"), /Only PDF/);
  assert.match(rejectionReason(file("application/pdf", 21 * 1024 * 1024), "raw"), /20 MB limit/);
});

test("sizes read in the units a person expects", () => {
  assert.equal(formatSize(2048), "2 KB");
  assert.equal(formatSize(5 * 1024 * 1024), "5.0 MB");
  assert.equal(formatSize(0), "0 KB");
});
