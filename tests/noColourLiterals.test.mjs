import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// src/shared is inside this tree now, so one walk covers everything.
const ADMIN_SRC = fileURLToPath(new URL("../src", import.meta.url));

/**
 * Files allowed to name a colour outright, each for a stated reason.
 * Anything else must go through a token, or an admin changing primary_color
 * leaves a hardcoded patch of the old brand behind (§6 rule 4, acceptance §18.2).
 */
const ALLOWED = new Map([
  [
    "theme/color.js",
    "the light/dark foreground pair the contrast guard chooses between — fixed by definition",
  ],
  [
    "theme/applyTheme.js",
    "reads colours from site_profile; any literal here is a fallback for a malformed value",
  ],
]);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNCTIONAL = /\b(?:rgba?|hsla?|oklch|oklab)\(/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function offendersIn(root, label) {
  const found = [];

  for (const file of walk(root)) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if ([...ALLOWED.keys()].some((allowed) => rel.endsWith(allowed))) continue;

    const source = readFileSync(file, "utf8");
    // Strip comments: a hex in prose ("#D9EDD9, sampled from the assets") is
    // documentation, not a hardcoded colour.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    for (const pattern of [HEX, FUNCTIONAL]) {
      for (const match of code.match(pattern) ?? []) {
        found.push(`${label}/${rel}: ${match}`);
      }
    }
  }

  return found;
}

test("no component hardcodes a colour — everything goes through a token", () => {
  const offenders = offendersIn(ADMIN_SRC, "src");

  assert.deepEqual(
    offenders,
    [],
    `Colour literals found. Use a token from tokens.css instead:\n  ${offenders.join("\n  ")}`,
  );
});

test("the allowlist stays small and justified", () => {
  // If this grows, the rule is being eroded rather than applied.
  assert.ok(ALLOWED.size <= 3, "more than three exempt files means the rule is slipping");
  for (const [file, reason] of ALLOWED) {
    assert.ok(reason.length > 20, `${file} needs a real reason, not a placeholder`);
  }
});
