import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { isPublished, PUBLIC_PATHS, publicPath } from "../src/lib/publicPaths.js";
import { publicDownloadPath } from "../src/modules/downloads/downloadKey.js";

test("each resource gets the customer site's real path shape", () => {
  assert.equal(publicPath("product", "gold-blend"), "/products/gold-blend");
  assert.equal(publicPath("news", "harvest-2026"), "/news/harvest-2026");
  assert.equal(publicPath("download", "dealer_brochure"), "/downloads/dealer_brochure");
  assert.equal(publicPath("page", "/about"), "/about");
});

test("the download path matches the one its own module publishes", () => {
  // Two modules must not disagree about the public contract: references.js
  // scans banners and page blocks for exactly this path to warn before a
  // delete, and a mismatch would make that scan find nothing.
  assert.equal(PUBLIC_PATHS.download("dealer_brochure"), publicDownloadPath("dealer_brochure"));
});

test("nothing to link to yields null, not a broken path", () => {
  // /products/undefined renders as a working link and tells an editor the
  // content is live when it is not.
  for (const identifier of [null, undefined, ""]) {
    assert.equal(publicPath("product", identifier), null, `${identifier} should give no link`);
  }
  assert.equal(publicPath("nonsense", "x"), null, "an unknown kind links nowhere");
});

test("published means PUBLISHED, or active where there is no status", () => {
  assert.equal(isPublished({ status: "PUBLISHED" }), true);
  assert.equal(isPublished({ status: "DRAFT" }), false);
  assert.equal(isPublished({ status: "ARCHIVED" }), false);
  assert.equal(isPublished({ is_active: true }), true);
  assert.equal(isPublished({ is_active: false }), false);
  assert.equal(isPublished(null), false);
});

test("status wins over is_active when a row carries both", () => {
  assert.equal(isPublished({ status: "DRAFT", is_active: true }), false);
});

test("the pure module stays importable by node", () => {
  // It must not pull in config.js, which reads import.meta.env — a Vite
  // construct that throws under plain node and would make this file untestable.
  const source = readFileSync(
    fileURLToPath(new URL("../src/lib/publicPaths.js", import.meta.url)),
    "utf8",
  );
  // Comments stripped: the file documents this very constraint by naming
  // `import.meta.env`, and prose must not read as a violation.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.doesNotMatch(code, /^import .*config\.js/m);
  assert.doesNotMatch(code, /import\.meta\.env/);
});
