import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { brandLogo, BUNDLED_LOGO, isPlaceholderImage } from "../src/lib/brand.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const SEEDED = { url: "https://placehold.co/512x512/1B5E20/FFFFFF/png?text=Rajdhani", alt: "Rajdhani" };
const UPLOADED = { url: "https://res.cloudinary.com/rajdhani/image/upload/v1/logo.png", alt: "Rajdhani" };

test("a placeholder is not a logo", () => {
  assert.equal(brandLogo(SEEDED, "Rajdhani").url, BUNDLED_LOGO);
  assert.equal(brandLogo(UPLOADED, "Rajdhani").url, UPLOADED.url);
  assert.equal(isPlaceholderImage("https://res.cloudinary.com/x/placehold.co-logo.png"), false);
});

test("the rule matches the customer site's, because both read the same row", () => {
  // The two apps show the same `site_profile` logo. If they disagreed about
  // when it counts as set, one would show the mark and the other the
  // placeholder from the same data.
  const here = read("src/lib/brand.js");
  const there = readFileSync(
    fileURLToPath(new URL("../../customer/src/lib/brand.js", import.meta.url)),
    "utf8",
  );
  const rule = (source) => /const PLACEHOLDER = (.+);/.exec(source)?.[1];

  assert.equal(rule(here), rule(there));
  assert.ok(rule(here), "the placeholder rule is gone");
});

test("the bundled file is where this app serves from", () => {
  // The customer site moved its public directory to `static/`; the admin did
  // not, so the same constant resolves out of a different folder.
  assert.equal(BUNDLED_LOGO, "/rajdhani-logo.png");
  assert.ok(existsSync(fileURLToPath(new URL("../public/rajdhani-logo.png", import.meta.url))));
  assert.doesNotMatch(read("vite.config.js"), /publicDir/);
});

test("the sidebar draws whatever the helper decided, on something to sit on", () => {
  // The supplied file is a lockup on an opaque white background and the sidebar
  // is dark brand green — without a chip behind it, it reads as a white
  // rectangle rather than as a mark.
  const sidebar = read("src/components/layout/Brandmark.jsx");

  assert.match(sidebar, /brandLogo\(site\?\.logos\?\.light \?\? site\?\.logos\?\.dark, site\?\.name\)/);
  assert.match(sidebar, /rounded bg-white object-contain/);
  assert.doesNotMatch(sidebar, /\{logo\?\.url \? \(/, "the raw API value is still being used");
});

test("the login card gives the lockup a box of its own shape", () => {
  // It is roughly 3:2. In the square box the leaf glyph used, it letterboxes to
  // about half the height and the wordmark inside stops being readable.
  const login = read("src/pages/LoginPage.jsx");

  assert.match(login, /src=\{BUNDLED_LOGO\}/);
  assert.match(login, /className="h-12 w-auto"/);
});

test("the tab carries the mark, and nothing competes with it", () => {
  const html = read("index.html");

  assert.match(html, /<link rel="icon" type="image\/png" href="\/rajdhani-logo\.png" \/>/);
  assert.equal((html.match(/rel="icon"/g) ?? []).length, 1, "a second icon would win over it");
});
