import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  CHANGE_KIND,
  changeKind,
  diffRows,
  fieldLabel,
  formatValue,
  hasDiff,
} from "../src/modules/audit/auditDiff.js";
import {
  ACTION_VALUES,
  actionLabel,
  actionTone,
  describeEntry,
  RESOURCES,
  resourceLabel,
  subjectOf,
  toActionFilter,
  verbOf,
} from "../src/modules/audit/auditVocabulary.js";

const routes = readFileSync(
  fileURLToPath(new URL("../../../backend/api/routes/admin.php", import.meta.url)),
  "utf8",
);

test("every resource in the filter is one the API actually audits", () => {
  // `resource` is an exact-match filter: a name that is not a real entity type
  // returns an empty page, which reads as "nothing happened" — the worst
  // possible lie for an evidence trail.
  const audited = new Set(
    [...routes.matchAll(/new AuditLog\(\s*'([A-Za-z]+)'/g)].map((m) => m[1]),
  );

  assert.ok(audited.size > 20, "routes/admin.php was not parsed as expected");

  for (const resource of RESOURCES) {
    assert.ok(audited.has(resource), `"${resource}" is not an entity type any route audits`);
  }
});

test("no audited resource is missing from the filter", () => {
  const audited = new Set(
    [...routes.matchAll(/new AuditLog\(\s*'([A-Za-z]+)'/g)].map((m) => m[1]),
  );

  for (const resource of audited) {
    assert.ok(RESOURCES.includes(resource), `"${resource}" is audited but cannot be filtered on`);
  }
});

test("every custom action the routes declare can be filtered on", () => {
  const custom = new Set([...routes.matchAll(/action:\s*'([a-z_]+)'/g)].map((m) => m[1]));

  for (const action of custom) {
    assert.ok(ACTION_VALUES.includes(action), `custom action "${action}" is not offered`);
  }
  // Plus the three the middleware derives from the HTTP verb.
  for (const derived of ["create", "update", "delete"]) {
    assert.ok(ACTION_VALUES.includes(derived));
  }
});

test("an action string splits into its two halves", () => {
  assert.equal(subjectOf("banner.update"), "banner");
  assert.equal(verbOf("banner.update"), "update");
  assert.equal(verbOf("review.bulk_approve"), "bulk_approve");
  assert.equal(verbOf("banner"), null, "no verb at all");
});

test("the filter rebuilds the action string the middleware writes", () => {
  // strtolower(entityType) . '.' . action
  assert.equal(toActionFilter("Banner", "update"), "banner.update");
  assert.equal(toActionFilter("ProductPackSize", "reorder"), "productpacksize.reorder");
  assert.equal(toActionFilter(null, "update"), null, "a verb alone is not an action");
  assert.equal(toActionFilter("Banner", null), null);
});

test("resources and actions read as English", () => {
  assert.equal(resourceLabel("ProductPackSize"), "Product pack size");
  assert.equal(resourceLabel("News"), "News");
  assert.equal(actionLabel("banner.update"), "Updated");
  assert.equal(actionLabel("review.bulk_approve"), "Approved in bulk");
  assert.equal(actionTone("product.delete"), "danger");
  assert.equal(actionTone("product.create"), "success");
});

test("an entry summarises as a sentence", () => {
  const entry = { admin_name: "Nisad", action: "product.update", entity_type: "Product" };
  assert.equal(describeEntry(entry), "Nisad updated a product");
});

test("a removed admin is still named as someone", () => {
  // admin_name is null when the account has since been deleted. "null updated
  // a product" would be worse than useless in an evidence trail.
  const entry = { admin_name: null, action: "product.update", entity_type: "Product" };
  assert.match(describeEntry(entry), /^A removed admin updated/);
});

test("the three shapes are told apart from the data, not the action name", () => {
  assert.equal(changeKind({ before: null, after: { name: "x" } }), CHANGE_KIND.CREATE);
  assert.equal(changeKind({ before: { name: "x" }, after: null }), CHANGE_KIND.DELETE);
  assert.equal(changeKind({ before: { name: "x" }, after: { name: "y" } }), CHANGE_KIND.UPDATE);
});

test("an update pairs each changed field's old and new value", () => {
  // Both sides carry only the changed keys — AuditDiff::compact() reduced them
  // before writing, so the key sets always match.
  const rows = diffRows({
    before: { status: "DRAFT", sort_order: 2 },
    after: { status: "PUBLISHED", sort_order: 1 },
  });

  const status = rows.find((r) => r.field === "status");
  assert.equal(status.label, "Status");
  assert.equal(status.from.text, "DRAFT");
  assert.equal(status.to.text, "PUBLISHED");

  const order = rows.find((r) => r.field === "sort_order");
  assert.equal(order.label, "Order");
  assert.equal(order.from.text, "2");
});

test("a create shows no 'from' side to argue with", () => {
  // before is null, so every field is new. Rendering "Not set → x" would be
  // technically true and read as though something was overwritten.
  const rows = diffRows({ before: null, after: { title: "Dealer Brochure", is_active: true } });

  const title = rows.find((r) => r.field === "title");
  assert.equal(title.from.empty, true);
  assert.equal(title.to.text, "Dealer Brochure");
});

test("a delete shows what was there, with nothing after it", () => {
  const rows = diffRows({ before: { title: "Old brochure" }, after: null });
  const title = rows.find((r) => r.field === "title");

  assert.equal(title.from.text, "Old brochure");
  assert.equal(title.to.empty, true);
});

test("timestamps and ids are not shown as changes", () => {
  // updated_at changes on literally every save and answers nothing.
  const rows = diffRows({
    before: { updated_at: "2026-09-01T10:00:00Z", created_at: "2026-01-01T00:00:00Z", id: "01J", title: "a" },
    after: { updated_at: "2026-09-02T10:00:00Z", created_at: "2026-01-01T00:00:00Z", id: "01J", title: "b" },
  });

  assert.deepEqual(rows.map((r) => r.field), ["title"]);
});

test("a row with nothing to expand says so", () => {
  // A reorder or bulk action has no single row and records no field diff.
  assert.equal(hasDiff({ before: null, after: null }), false);
  assert.equal(hasDiff({ before: {}, after: {} }), false);
  assert.equal(hasDiff({ before: { a: 1 }, after: { a: 2 } }), true);
});

test("values render as meaning, not as JSON", () => {
  assert.deepEqual(formatValue(true), { text: "Yes", empty: false });
  assert.deepEqual(formatValue(false), { text: "No", empty: false });
  assert.deepEqual(formatValue(null), { text: "Not set", empty: true });
  assert.deepEqual(formatValue(""), { text: "Empty", empty: true });
  assert.deepEqual(formatValue(0), { text: "0", empty: false }, "zero is a value, not emptiness");
});

test("an absent value is distinguishable from the words a person typed", () => {
  // Someone could legitimately type "Not set" into a field.
  assert.equal(formatValue(null).empty, true);
  assert.equal(formatValue("Not set").empty, false);
});

test("a list of ids becomes a count rather than a wall of ULIDs", () => {
  const objects = formatValue([{ id: "01J" }, { id: "02J" }, { id: "03J" }]);
  assert.equal(objects.text, "3 items");

  // But short scalars are more useful spelled out.
  assert.equal(formatValue(["black", "green"]).text, "black, green");
  assert.equal(formatValue([]).text, "Nothing");
});

test("an object names its keys instead of rendering as [object Object]", () => {
  assert.equal(formatValue({ light: 1, dark: 2 }).text, "{ light, dark }");
});

test("long values are marked so they get their own block", () => {
  const long = "x".repeat(200);
  const rows = diffRows({ before: { body: long, status: "DRAFT" }, after: { body: "y", status: "LIVE" } });

  assert.equal(rows.find((r) => r.field === "body").long, true);
  assert.equal(rows.find((r) => r.field === "status").long, false);
  // Short rows first, so a one-line status flip is not buried under an article.
  assert.equal(rows[0].field, "status");
});

test("field names are humanised, and the awkward ones overridden", () => {
  assert.equal(fieldLabel("meta_title"), "Meta title");
  assert.equal(fieldLabel("is_active"), "Active");
  assert.equal(fieldLabel("seo_title"), "SEO title");
  assert.equal(fieldLabel("primary_color"), "Primary colour");
  assert.equal(fieldLabel("parent_id"), "Parent", "the _id suffix is noise to a reader");
  assert.equal(fieldLabel("phone_primary"), "Phone primary");
});

test("the exact fixtures from the backend's own AuditDiffTest render correctly", () => {
  // Copied from backend/api/tests/Unit/AuditDiffTest.php, so the two agree on
  // what `compact()` produces rather than on what I assumed it produces.

  // testACreateStoresTheWholeAfterRowWithNoBefore
  const create = { before: null, after: { id: "01", title: "New banner" } };
  assert.equal(changeKind(create), CHANGE_KIND.CREATE);
  assert.deepEqual(diffRows(create).map((r) => r.field), ["title"], "the id is noise, not a change");

  // testADeleteStoresTheWholeBeforeRowWithNoAfter
  const remove = { before: { id: "01", title: "Old banner" }, after: null };
  assert.equal(changeKind(remove), CHANGE_KIND.DELETE);
  assert.equal(diffRows(remove)[0].from.text, "Old banner");

  // testAnUpdateKeepsOnlyTheFieldsThatChanged — the long body is absent from
  // both sides, which is the whole point of compacting.
  const update = { before: { title: "Old" }, after: { title: "New" } };
  assert.deepEqual(diffRows(update).map((r) => r.field), ["title"]);

  // testIdenticalBeforeAndAfterProducesAnEmptyDiff
  assert.equal(hasDiff({ before: {}, after: {} }), false);

  // testAFieldAddedOnlyOnOneSideCountsAsChanged
  const added = { before: { note: null }, after: { note: "added later" } };
  const note = diffRows(added)[0];
  assert.equal(note.from.empty, true, "absent before");
  assert.equal(note.to.text, "added later");
});

test("a missing entry does not crash the expander", () => {
  assert.deepEqual(diffRows(null), []);
  assert.deepEqual(diffRows({}), []);
  assert.equal(hasDiff(null), false);
});
