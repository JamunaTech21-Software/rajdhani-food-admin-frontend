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

  assert.deepEqual(keys, ["our_story", "mission", "vision", "values"]);
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
  assert.equal(blocks.length, 5, "four designed plus the extra");
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
