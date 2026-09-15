import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const config = read("src/config.js");
const example = read(".env.example");

/**
 * Names Vite defines on `import.meta.env` itself (vite/types/importMeta.d.ts).
 * Reading one of these expecting your own value is silent: the built-in is a
 * real string, so nothing throws, nothing warns, and the wrong value is used.
 */
const RESERVED = ["BASE_URL", "MODE", "DEV", "PROD", "SSR"];

// Comments are stripped first: config.js explains the BASE_URL trap by naming
// it, and a scanner that reads prose would flag the warning against it.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const readsOf = (source) =>
  [...stripComments(source).matchAll(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g)].map((m) => m[1]);

test("config never reads a name Vite has already defined", () => {
  // BASE_URL is the trap: it resolves to the app's public base path ("/"), so
  // API_BASE_URL becomes "" and every request goes to this origin instead of
  // the API — a deployment that builds cleanly and 404s on everything.
  for (const name of readsOf(config)) {
    assert.ok(
      !RESERVED.includes(name),
      `config.js reads import.meta.env.${name}, which Vite defines itself`,
    );
  }
});

test("every value config reads is VITE_-prefixed, or it never reaches the browser", () => {
  for (const name of readsOf(config)) {
    assert.match(name, /^VITE_/, `import.meta.env.${name} is not exposed to client code`);
  }
});

test(".env.example documents exactly what config reads", () => {
  // A variable renamed in one place and not the other deploys with the old name
  // set in Vercel and the new one read by the code — again, silently.
  const documented = [...example.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((m) => m[1]);

  assert.deepEqual([...readsOf(config)].sort(), [...documented].sort());
});
