import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import * as lucide from "lucide-react";

// Parse the registry keys and component names straight out of the source, so
// this checks the real file rather than a copy that can drift.
const source = readFileSync(
  new URL("../src/components/ui/icon-registry.js", import.meta.url),
  "utf8",
);
const body = source.slice(source.indexOf("const REGISTRY"), source.indexOf("export const FALLBACK"));
const entries = [...body.matchAll(/^\s*"?([a-z-]+)"?:\s*([A-Za-z]+),/gm)].map(([, k, v]) => [k, v]);


test(`every registry entry resolves to a real Lucide component (${entries.length} entries)`, () => {
  assert.ok(entries.length >= 20, `expected a populated registry, parsed ${entries.length}`);
  for (const [key, component] of entries) {
    assert.ok(lucide[component], `${key} -> ${component} is not exported by lucide-react`);
  }
});

test("every icon_name the live API serves is covered", () => {
  // Observed on 2026-09-15 from GET /public/categories, plus the seeder values.
  const fromDatabase = [
    "leaf",
    "coffee",
    "sparkles",
    "sprout",
    "package",
    "wheat",
    "flame",
    "star",
    "check-circle",
  ];
  const keys = new Set(entries.map(([k]) => k));
  const missing = fromDatabase.filter((n) => !keys.has(n));
  assert.deepEqual(missing, [], `registry is missing: ${missing.join(", ")}`);
});

test("the fallback glyph exists, for null and unrecognised names", () => {
  // One category in the live data has icon_name: null.
  assert.ok(lucide.CircleHelp, "CircleHelp must exist for the fallback path");
  assert.match(source, /export const FALLBACK = CircleHelp/, "registry must export a fallback");

  const component = readFileSync(
    new URL("../src/components/ui/Icon.jsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /REGISTRY\[name\] \?\? FALLBACK/, "Icon must fall back, not crash");
});

test("no wildcard import — that would bundle all 6,299 icons", () => {
  // Anchored to a real statement: the file's own comment mentions `import * as`
  // to explain why it is avoided, and an unanchored match hits that instead.
  assert.doesNotMatch(source, /^import \* as/m, "wildcard import defeats tree-shaking");
  assert.ok(Object.keys(lucide).length > 5000, "sanity: lucide really is that large");
});

