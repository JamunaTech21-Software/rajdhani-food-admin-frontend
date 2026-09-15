import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  asTree,
  groupByLocation,
  locationOf,
  MENU_LOCATION_VALUES,
  parentOptions,
} from "../src/modules/settings/menuLocations.js";

const LINKS = [
  { id: "h1", location: "header", label: "Home", url: "/", parent_id: null, sort_order: 1 },
  { id: "h2", location: "header", label: "Products", url: "/products", parent_id: null, sort_order: 2 },
  { id: "h2a", location: "header", label: "Black Tea", url: "/products/black", parent_id: "h2", sort_order: 2 },
  { id: "h2b", location: "header", label: "Green Tea", url: "/products/green", parent_id: "h2", sort_order: 1 },
  { id: "f1", location: "footer_quick", label: "About", url: "/about", parent_id: null, sort_order: 1 },
  { id: "l1", location: "legal", label: "Privacy", url: "/privacy", parent_id: null, sort_order: 1 },
];

test("the locations match the enum the API accepts", () => {
  // MenuLinkInput's location enum. A value not in it is a 422 on every save.
  const spec = readFileSync(
    fileURLToPath(new URL("../../../backend/api/docs/openapi.yaml", import.meta.url)),
    "utf8",
  );
  const documented = spec
    .match(/location:\s*\{\s*type:\s*string,\s*enum:\s*\[([^\]]+)\]/)?.[1]
    .split(",")
    .map((v) => v.trim());

  assert.deepEqual(MENU_LOCATION_VALUES, documented);
});

test("links are grouped by location, in sort order", () => {
  // Flat: children are included here and nested later by asTree. Sorting is by
  // sort_order alone, so h2b (1) precedes its own parent h2 (2) at this stage.
  const grouped = groupByLocation(LINKS);

  assert.deepEqual(grouped.get("header").map((l) => l.id), ["h1", "h2b", "h2", "h2a"]);
  assert.deepEqual(grouped.get("footer_quick").map((l) => l.id), ["f1"]);
  assert.deepEqual(grouped.get("legal").map((l) => l.id), ["l1"]);
});

test("every location is present even when empty, so nothing is unreachable", () => {
  // An absent key would mean a location with no "Add" button — the only way to
  // put the first link into it.
  const grouped = groupByLocation([]);
  for (const value of MENU_LOCATION_VALUES) {
    assert.deepEqual(grouped.get(value), [], `${value} is missing`);
  }
});

test("children hang off their parent, in their own order", () => {
  const tree = asTree(groupByLocation(LINKS).get("header"));

  assert.deepEqual(tree.map((l) => l.id), ["h1", "h2"], "only top-level links are roots");
  assert.deepEqual(tree[1].children.map((l) => l.id), ["h2b", "h2a"], "sorted by sort_order");
  assert.deepEqual(tree[0].children, []);
});

test("a child whose parent is missing is shown, not swallowed", () => {
  // An orphan is a link an editor can still see and fix. Hiding it would leave
  // a row that exists in the database and nowhere in the UI.
  const orphan = { id: "x", location: "header", label: "Orphan", parent_id: "gone", sort_order: 1 };
  const tree = asTree([orphan]);

  assert.deepEqual(tree.map((l) => l.id), ["x"]);
});

test("a link cannot be nested under itself", () => {
  const options = parentOptions(LINKS, { location: "header", id: "h2" });

  assert.ok(!options.some((o) => o.id === "h2"), "itself is not a candidate");
});

test("only top-level links in the same location can be parents", () => {
  const options = parentOptions(LINKS, { location: "header", id: "h1" });

  assert.deepEqual(options.map((o) => o.id), ["h2"]);
  // h2a and h2b are already children — the model is one level deep.
  assert.ok(!options.some((o) => o.parent_id), "no child is offered as a parent");
  assert.ok(options.every((o) => o.location === "header"), "no cross-location nesting");
});

test("only the header nests", () => {
  assert.equal(locationOf("header").nesting, true);
  for (const value of ["footer_quick", "footer_products", "legal"]) {
    assert.equal(locationOf(value).nesting, false, `${value} should not nest`);
  }
});

test("an unknown location degrades instead of crashing", () => {
  const unknown = locationOf("somewhere_new");

  assert.equal(unknown.label, "somewhere_new");
  assert.equal(unknown.nesting, false);
});

test("missing input is tolerated", () => {
  assert.deepEqual(asTree(null), []);
  assert.deepEqual(parentOptions(null, null), []);
  assert.equal(groupByLocation(null).get("header").length, 0);
});
