import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// resources.jsx contains JSX, which plain node cannot import, so this reads the
// source the same way the icon-registry test does. What matters here is that the
// descriptors agree with the API contract — a text check catches that fine.
const SOURCE = readFileSync(
  new URL("../src/modules/sections/resources.jsx", import.meta.url),
  "utf8",
);

/** Pull each `{ id: "...", ... }` descriptor block out of the RESOURCES array. */
function descriptors() {
  const blocks = [...SOURCE.matchAll(/\n {4}id: "([a-z-]+)",([\s\S]*?)\n {2}\},/g)];
  return blocks.map(([, id, body]) => ({
    id,
    body,
    endpoint: (body.match(/endpoint: "([^"]+)"/) ?? [])[1],
    scopeKey: (body.match(/scopeKey: (?:"([a-z_]+)"|(null))/) ?? []).slice(1).find(Boolean),
  }));
}

const ALL = descriptors();

test("all five section resources are declared", () => {
  assert.deepEqual(
    ALL.map((r) => r.id),
    ["features", "process", "stats", "certifications", "testimonials"],
  );
});

test("each resource's scopeKey matches what its reorder endpoint requires", () => {
  // Read off docs/openapi.yaml on 2026-09-15:
  //   feature-items/reorder   required: [section, ids]
  //   process-steps/reorder   required: [group, ids]
  //   stat-counters/reorder   required: [group, ids]
  //   certifications/reorder  required: [ids]
  //   testimonials/reorder    required: [ids]
  //
  // Getting this wrong sends a reorder the API rejects, or worse, one that
  // silently reorders the wrong scope.
  const EXPECTED = {
    "/admin/feature-items": "section",
    "/admin/process-steps": "group",
    "/admin/stat-counters": "group",
    "/admin/certifications": "null",
    "/admin/testimonials": "null",
  };

  for (const resource of ALL) {
    assert.equal(
      resource.scopeKey,
      EXPECTED[resource.endpoint],
      `${resource.id} (${resource.endpoint}) declares the wrong reorder scope`,
    );
  }
});

test("the section and group enums match the API's", () => {
  const enumsInSource = (id) => {
    const body = ALL.find((r) => r.id === id).body;
    return [...body.matchAll(/value: "([A-Z_]+)"/g)].map((m) => m[1]);
  };

  assert.deepEqual(enumsInSource("features"), [
    "HOME_USP", "HOME_WHY_US", "ABOUT_VALUES", "ABOUT_STRENGTH",
    "QUALITY_COMMITMENT", "DEALER_BENEFITS", "CONTACT_ASSURANCE", "PRODUCT_HIGHLIGHTS",
  ]);

  assert.deepEqual(enumsInSource("process"), [
    "FROM_GARDEN_TO_CUP", "HOW_WE_MAKE_TEA", "QUALITY_PROCESS",
    "MANUFACTURING_PROCESS", "BECOME_DEALER",
  ]);

  assert.deepEqual(enumsInSource("stats"), [
    "HOME", "ABOUT", "GALLERY", "TEA_GARDEN", "DEALER_NETWORK",
  ]);
});

test("scoped resources carry a scope label and every scope has a human label", () => {
  for (const resource of ALL.filter((r) => r.scopeKey !== "null")) {
    assert.match(resource.body, /scopeLabel: "/, `${resource.id} needs a scope label`);

    const values = [...resource.body.matchAll(/value: "[A-Z_]+", label: "([^"]+)"/g)];
    const rawValues = [...resource.body.matchAll(/value: "([A-Z_]+)"/g)];
    assert.equal(
      values.length,
      rawValues.length,
      `${resource.id} has a scope with no human label — editors would see the raw enum`,
    );
  }
});

test("one implementation, not five copies", () => {
  // RTPP-44's acceptance criterion, asserted structurally: the descriptors carry
  // the differences, and exactly one component renders them.
  const manager = readFileSync(
    new URL("../src/modules/sections/SectionManager.jsx", import.meta.url),
    "utf8",
  );
  const dialog = readFileSync(
    new URL("../src/modules/sections/ResourceFormDialog.jsx", import.meta.url),
    "utf8",
  );

  for (const [name, source] of [["SectionManager", manager], ["ResourceFormDialog", dialog]]) {
    // A per-resource branch here would mean the abstraction had leaked.
    for (const id of ["features", "process", "stats", "certifications", "testimonials"]) {
      assert.ok(
        !source.includes(`"${id}"`),
        `${name} branches on the "${id}" resource — the differences belong in the descriptor`,
      );
    }
  }
});

test("no resource hardcodes a colour as its example", () => {
  // The icon_bg_color field teaches the format rather than suggesting a value:
  // a concrete suggestion invites pasting the brand tint as a frozen colour.
  assert.match(SOURCE, /placeholder: "#RRGGBB"/);
  assert.doesNotMatch(SOURCE, /#[0-9a-fA-F]{6}/, "no literal hex in the descriptors");
});
