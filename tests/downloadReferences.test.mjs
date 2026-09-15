import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deleteWarning,
  findReferences,
  scanWasComplete,
} from "../src/modules/downloads/references.js";

const banners = [
  { title: "Home hero", primary_cta_url: "/products", secondary_cta_url: "/downloads/dealer_brochure" },
  { title: "About hero", primary_cta_url: "/downloads/catalogue_2026", secondary_cta_url: null },
  { eyebrow_text: "PREMIUM TEA", placement: "HOME_HERO", primary_cta_url: "/contact" },
];

const blocks = [
  { page_key: "about", block_key: "mission", heading: "Our mission", cta_url: null, body: "<p>Hello</p>" },
  {
    page_key: "dealership",
    block_key: "apply",
    heading: "Become a dealer",
    cta_url: null,
    body: '<p>Read the <a href="/downloads/dealer_brochure">brochure</a> first.</p>',
  },
  { page_key: "contact", block_key: "form", heading: null, cta_url: "/downloads/price_list", body: null },
];

test("a referenced key is found in both banners and page blocks", () => {
  const found = findReferences("dealer_brochure", { banners, blocks });

  assert.deepEqual(found, [
    { kind: "banner", label: "Home hero" },
    { kind: "block", label: "dealership — Become a dealer" },
  ]);
});

test("a link inside rich-text body counts", () => {
  // The dealership block only mentions the key inside an <a href>, which is
  // exactly how an editor links a brochure from prose.
  const found = findReferences("dealer_brochure", { blocks });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, "block");
});

test("a key that is a prefix of another is not a false positive", () => {
  // "/downloads/catalogue_2026" must not report as a reference to "catalogue".
  assert.deepEqual(findReferences("catalogue", { banners, blocks }), []);
  assert.equal(findReferences("catalogue_2026", { banners, blocks }).length, 1);
});

test("an unreferenced key finds nothing", () => {
  assert.deepEqual(findReferences("annual_report", { banners, blocks }), []);
});

test("a block with no heading falls back to its keys", () => {
  const found = findReferences("price_list", { blocks });
  assert.deepEqual(found, [{ kind: "block", label: "contact — form" }]);
});

test("a banner with no title falls back to something recognisable", () => {
  const untitled = [{ placement: "HOME_HERO", primary_cta_url: "/downloads/x" }];
  assert.deepEqual(findReferences("x", { banners: untitled }), [
    { kind: "banner", label: "HOME_HERO" },
  ]);
});

test("missing sources are tolerated, not crashed on", () => {
  assert.deepEqual(findReferences("dealer_brochure", {}), []);
  assert.deepEqual(findReferences("dealer_brochure", { banners: null, blocks: undefined }), []);
  assert.deepEqual(findReferences(null, { banners, blocks }), []);
});

test("an incomplete scan is distinguishable from a clean one", () => {
  assert.equal(scanWasComplete({ banners, blocks }), true);
  assert.equal(scanWasComplete({ banners, blocks: [] }), true, "empty is still a scan");
  assert.equal(scanWasComplete({ banners }), false, "blocks were never fetched");
  assert.equal(scanWasComplete({}), false);
});

test("the confirmation names what will break", () => {
  const warning = deleteWarning({ key: "dealer_brochure" }, { banners, blocks });

  assert.match(warning, /Home hero/);
  assert.match(warning, /Become a dealer/);
  assert.match(warning, /those links/, "plural for two references");
  assert.match(warning, /404/, "says what a visitor will see");
});

test("one reference reads as singular", () => {
  const warning = deleteWarning({ key: "price_list" }, { banners, blocks });
  assert.match(warning, /that link/);
  assert.doesNotMatch(warning, /those links/);
});

test("a clean scan says so plainly", () => {
  const warning = deleteWarning({ key: "annual_report" }, { banners, blocks });
  assert.match(warning, /Nothing links to \/downloads\/annual_report/);
  assert.match(warning, /download count is lost/, "the other consequence of deleting");
});

test("an unchecked scan never claims nothing links here", () => {
  // A Sales admin can read downloads but not banners or page content. Telling
  // them "no page will break" would be a claim the app cannot support.
  const warning = deleteWarning({ key: "annual_report" }, { banners: null, blocks: null });

  assert.match(warning, /may still exist/);
  assert.doesNotMatch(warning, /no page will break/);
});
