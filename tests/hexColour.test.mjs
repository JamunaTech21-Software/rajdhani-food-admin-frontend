import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { HEX_COLOUR, isHexColour, toSwatch } from "../src/modules/settings/hexColour.js";

test("the pattern is the API's, not one of our own", () => {
  // openapi.yaml's HexColour. If the two drift, the form accepts something the
  // API rejects with a 422, or rejects something it would have taken.
  const spec = readFileSync(
    fileURLToPath(new URL("../../../backend/api/docs/openapi.yaml", import.meta.url)),
    "utf8",
  );
  const documented = spec.match(/pattern:\s*'(\^#\(\?:[^']+)'/)?.[1];

  assert.ok(documented, "HexColour's pattern was not found in the spec");
  assert.equal(HEX_COLOUR.source, documented);
});

test("the three lengths the API allows are accepted", () => {
  assert.equal(isHexColour("#abc"), true, "shorthand");
  assert.equal(isHexColour("#1B5E20"), true, "the usual form");
  assert.equal(isHexColour("#1B5E2080"), true, "with alpha");
  assert.equal(isHexColour("#ABCDEF"), true, "uppercase");
});

test("what the API would reject is rejected here first", () => {
  for (const bad of ["1B5E20", "#12", "#12345", "#1234567", "#GGGGGG", "", null, undefined, "red"]) {
    assert.equal(isHexColour(bad), false, `${bad} should be rejected`);
  }
});

test("the native swatch gets six digits, never shorthand or alpha", () => {
  // <input type="color"> silently refuses anything else and falls back to black,
  // which would show a colour nobody chose.
  assert.equal(toSwatch("#abc"), "#aabbcc");
  assert.equal(toSwatch("#1B5E20"), "#1B5E20");
  assert.equal(toSwatch("#1B5E2080"), "#1B5E20", "alpha dropped, not passed through");
});

test("an unusable value yields no swatch at all", () => {
  // The field renders an empty placeholder rather than seeding the picker.
  for (const bad of ["", null, undefined, "nonsense"]) {
    assert.equal(toSwatch(bad), null);
  }
});
