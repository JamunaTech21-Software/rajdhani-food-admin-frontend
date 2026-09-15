import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isValidKey,
  keyChangeWarning,
  publicDownloadPath,
  toKey,
} from "../src/modules/downloads/downloadKey.js";

test("a key suggested from a title matches what the API accepts", () => {
  // The API's pattern is ^[a-z0-9_]+$ — anything else is a 422.
  for (const title of [
    "Dealer Brochure",
    "Product Catalogue 2026",
    "Rajdhani — Company Profile",
    "  Spaced   Out  ",
    "Price List (Wholesale)",
  ]) {
    const key = toKey(title);
    assert.ok(isValidKey(key), `"${title}" produced "${key}", which the API would reject`);
  }
});

test("keys read the way an editor would write them", () => {
  assert.equal(toKey("Dealer Brochure"), "dealer_brochure");
  assert.equal(toKey("Product Catalogue 2026"), "product_catalogue_2026");
  assert.equal(toKey("Price List (Wholesale)"), "price_list_wholesale");
});

test("accents are stripped rather than becoming underscores", () => {
  // "Brochure Français" would otherwise give "brochure_fran_ais".
  assert.equal(toKey("Brochure Français"), "brochure_francais");
  assert.equal(toKey("Café Menu"), "cafe_menu");
});

test("no leading, trailing or doubled underscores", () => {
  assert.equal(toKey("  Leading and trailing  "), "leading_and_trailing");
  assert.equal(toKey("Lots---of___separators"), "lots_of_separators");
  assert.equal(toKey("!!!"), "", "a title with nothing usable yields nothing, not '_'");
});

test("a key never exceeds the column length", () => {
  const key = toKey("x".repeat(200));
  assert.ok(key.length <= 64, `got ${key.length} characters`);
  assert.ok(isValidKey(key));
});

test("the API's pattern is enforced before sending", () => {
  assert.equal(isValidKey("dealer_brochure"), true);
  assert.equal(isValidKey("Dealer_Brochure"), false, "uppercase is rejected");
  assert.equal(isValidKey("dealer-brochure"), false, "hyphens are rejected");
  assert.equal(isValidKey("dealer brochure"), false);
  assert.equal(isValidKey(""), false);
  assert.equal(isValidKey(undefined), false);
});

test("the public path is built from the key, not the id", () => {
  // RTPP-51's first acceptance criterion rests on this: the URL follows the key,
  // so replacing the file behind it changes nothing a visitor sees.
  assert.equal(publicDownloadPath("dealer_brochure"), "/downloads/dealer_brochure");
});

test("renaming a key warns; replacing a file does not", () => {
  assert.equal(keyChangeWarning("dealer_brochure", "dealer_brochure"), null, "unchanged — no warning");
  assert.equal(keyChangeWarning(null, "new_key"), null, "a new download has nothing to break");

  const warning = keyChangeWarning("dealer_brochure", "brochure");
  assert.match(warning, /dealer_brochure/, "names the key that will break");
  assert.match(warning, /Replacing the file instead/, "points at the safe alternative");
});
