import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blocksForPage,
  PAGES,
  pageOf,
  SECTIONS_ELSEWHERE,
} from "../src/modules/page-content/page-catalogue.js";

const row = (block_key, extra = {}) => ({
  id: `id-${block_key}`,
  page_key: "about",
  block_key,
  heading: `Heading for ${block_key}`,
  status: "PUBLISHED",
  ...extra,
});

test("a designed block with no row is still listed, so it can be created", () => {
  // The whole point: the database has five blocks, the designs have far more.
  // Listing only what exists would make the rest uneditable.
  const blocks = blocksForPage("about", []);
  const keys = blocks.map((b) => b.key);

  assert.deepEqual(keys, [
    "our_story",
    "mission",
    "vision",
    "values",
    "foundations",
    "strength",
    "certifications",
  ]);
  for (const block of blocks) {
    assert.equal(block.row, null);
    assert.equal(block.designed, true);
    assert.ok(block.where, "every block needs labelling saying where it appears");
  }
});

test("an existing row is attached to its designed block", () => {
  const blocks = blocksForPage("about", [row("mission")]);
  const mission = blocks.find((b) => b.key === "mission");

  assert.equal(mission.row.id, "id-mission");
  assert.equal(blocks.find((b) => b.key === "vision").row, null, "the others stay unset");
});

test("a row outside the catalogue is appended, never dropped", () => {
  // A block added server-side must not become unreachable in the admin.
  const blocks = blocksForPage("about", [row("mission"), row("surprise_block")]);
  const extra = blocks.find((b) => b.key === "surprise_block");

  assert.ok(extra, "an unrecognised block_key must still be listed");
  assert.equal(extra.designed, false);
  assert.equal(extra.row.id, "id-surprise_block");
  assert.equal(blocks.length, 8, "the seven designed plus the extra");
});

test("an unknown page yields nothing rather than throwing", () => {
  assert.deepEqual(blocksForPage("no-such-page", []), []);
  assert.equal(pageOf("no-such-page"), undefined);
});

test("every catalogue entry is well formed", () => {
  for (const page of PAGES) {
    assert.ok(page.key && page.label && page.path, `${page.key} is missing a field`);
    assert.ok(page.path.startsWith("/"), `${page.key} path must be site-relative`);
    assert.ok(page.blocks.length > 0, `${page.key} has no blocks`);

    const keys = page.blocks.map((b) => b.key);
    assert.equal(new Set(keys).size, keys.length, `${page.key} has duplicate block keys`);

    for (const block of page.blocks) {
      assert.ok(block.label, `${page.key}.${block.key} needs a human label`);
      assert.ok(block.where, `${page.key}.${block.key} needs a "where it appears" note`);
      assert.ok(block.uses?.length, `${page.key}.${block.key} declares no fields`);
    }
  }
});

test("catalogue pages are pages the site actually has", () => {
  // Cross-checked against the page keys seeded into seo_meta by the backend.
  // gallery, news and products are excluded on purpose: they are driven by
  // their own records, not by static prose blocks.
  const SITE_PAGE_KEYS = new Set([
    "home", "about", "products", "quality", "dealer", "gallery", "news", "contact",
    "privacy", "terms",
  ]);

  for (const page of PAGES) {
    assert.ok(SITE_PAGE_KEYS.has(page.key), `"${page.key}" is not a page the site serves`);
  }
});

test("pages whose card grids live elsewhere say so", () => {
  // Otherwise an editor hunts for the Values cards among these blocks and
  // concludes the screen is broken.
  for (const key of ["home", "about", "quality", "dealer", "contact"]) {
    assert.ok(SECTIONS_ELSEWHERE[key], `${key} should point at the Sections screen`);
    assert.match(SECTIONS_ELSEWHERE[key], /Sections/);
  }
});

// ── The list editor has to be able to grow ───────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dialog = readFileSync(
  fileURLToPath(new URL("../src/modules/page-content/BlockEditorDialog.jsx", import.meta.url)),
  "utf8",
);

test("the list box holds text, so a new line survives being typed", () => {
  // The field used to be a `Controller` holding `string[]`: it split the box
  // on every keystroke and joined the array back for display. Pressing Enter
  // made an empty line, `filter(Boolean)` dropped it, the array came back
  // unchanged and the controlled value rewrote the box without the newline —
  // so the list could never grow past whatever was seeded into it.
  //
  // Keeping the raw text in form state is what fixes it. If this ever goes
  // back to an array the box stops accepting a second line.
  assert.match(dialog, /bullet_points: z\.string\(\)/);
  assert.doesNotMatch(dialog, /bullet_points: z\.array/);
  assert.match(dialog, /\{\.\.\.register\("bullet_points"\)\}/);
});

test("the split happens once, on submit", () => {
  // Trimming while the cursor is in the box fights the person typing; doing
  // it on the way out does not.
  assert.match(
    dialog,
    /bullet_points: values\.bullet_points\s+\.split\("\\n"\)\s+\.map\(\(line\) => line\.trim\(\)\)\s+\.filter\(Boolean\)/,
  );
});

test("an existing list is loaded back into the box as lines", () => {
  assert.match(dialog, /bullet_points: \(row\.bullet_points \?\? \[\]\)\.join\("\\n"\)/);
  assert.match(dialog, /bullet_points: "",/, "and a new block starts empty, not as an array");
});

test("nothing caps how many items a list may have", () => {
  // The API stores this in a JSON column and neither validates nor truncates
  // a count, so the admin must not invent a limit of its own.
  // The declaration itself, with nothing chained onto it — `cta_label` two
  // lines down does carry a `.max(128)`, so a looser search finds that.
  assert.match(dialog, /bullet_points: z\.string\(\),\n/);
  assert.doesNotMatch(dialog, /maxLength/, "and no cap on the box either");
  assert.match(dialog, /hint="One per line, as many as you need\."/);
});

// ── Every block the site reads has to be creatable here ─────────────────

test("no page reads a block the admin cannot create", () => {
  // RTPP-43's criterion is that every block is editable from Page Content.
  // The catalogue is what makes an uncreated block visible, so a key the site
  // looks up but the catalogue omits is a section nobody can ever fill in —
  // it renders as nothing, for ever, with no clue why.
  //
  // `strength` was exactly that: the whole "Modern Manufacturing" band on
  // About was unreachable. `foundations`, `certifications` and `process` are
  // group headings which fall back to a structural default, so they looked
  // fine while still being uneditable.
  //
  // Derived from the customer pages rather than listed here, so a new
  // `blockFor(...)` on any page fails this until the catalogue catches up.
  //
  // Read across the monorepo, and skipped when that package is not checked
  // out beside this one — the admin has to stay installable on its own, and a
  // test that cannot see the other app should not fail the suite.
  const pageFile = (name) =>
    fileURLToPath(new URL(`../../customer/src/pages/${name}.jsx`, import.meta.url));

  const pages = { about: pageFile("AboutPage"), quality: pageFile("QualityPage") };
  if (!Object.values(pages).every((p) => existsSync(p))) return;

  for (const [pageKey, path] of Object.entries(pages)) {
    const source = readFileSync(path, "utf8");
    const wanted = [...source.matchAll(/blockFor\(all, "([a-z_]+)"\)/g)].map((m) => m[1]);
    const offered = new Set((pageOf(pageKey)?.blocks ?? []).map((b) => b.key));

    for (const key of wanted) {
      assert.ok(offered.has(key), `${pageKey} reads "${key}" but the catalogue does not offer it`);
    }
  }
});

test("a designed block with no row still shows, so it can be created", () => {
  // The placeholder is the whole point of the catalogue.
  const merged = blocksForPage("about", [row("our_story")]);
  const strength = merged.find((b) => b.key === "strength");

  assert.ok(strength, "strength should be listed");
  assert.equal(strength.row, null, "and listed as not set up yet");
});
