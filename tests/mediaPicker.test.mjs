import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((path) => ({
  path: relative(SRC, path).replaceAll("\\", "/"),
  source: readFileSync(path, "utf8"),
}));

const find = (name) => files.find((f) => f.path.endsWith(name));

test("every screen with an image field uses the shared picker", () => {
  // RTPP-50's second acceptance criterion, asserted structurally: products,
  // banners, page content, sections and news all go through MediaPicker rather
  // than each rolling its own browser.
  const expected = [
    "modules/products/tabs/ImagesTab.jsx",
    "modules/banners/BannerFormDialog.jsx",
    "modules/page-content/BlockEditorDialog.jsx",
    "modules/sections/ResourceFormDialog.jsx",
    "modules/news/NewsFormPage.jsx",
  ];

  for (const path of expected) {
    const file = find(path);
    assert.ok(file, `${path} is missing`);
    assert.match(file.source, /MediaPicker/, `${path} should use the shared picker`);
  }
});

test("only the media module talks to the signature endpoint", () => {
  // A screen calling /admin/media/signature directly would be rolling its own
  // uploader — the thing the criterion forbids.
  const callers = files
    .filter((f) => f.source.includes("/admin/media/signature"))
    .map((f) => f.path);

  assert.deepEqual(callers, ["modules/media/useMediaUpload.js"]);
});

test("no screen still shows a 'blocked on RTPP-50' notice", () => {
  // Five screens carried one while the endpoints were missing. A leftover would
  // tell an editor a feature is unavailable when it is sitting right there.
  // Scoped to RTPP-50 specifically: notices about *other* unbuilt endpoints are
  // still accurate (LeadDrawer points at RTPP-53 for the admin user list).
  const offenders = files
    .filter((f) => !f.path.endsWith("components/ui/MediaPicker.jsx"))
    .filter((f) => /RTPP-50|needs the media library/.test(f.source))
    .map((f) => f.path);

  assert.deepEqual(offenders, []);
});

test("the picker hands back the whole asset, not just an id", () => {
  // A caller building a list of images needs the URL and alt text to render a
  // thumbnail without a second fetch.
  const picker = find("components/ui/MediaPicker.jsx");
  assert.match(picker.source, /onChange\(asset\.id,\s*asset\)/);

  const images = find("modules/products/tabs/ImagesTab.jsx");
  assert.match(images.source, /function add\(_id, asset\)/, "the images tab consumes the asset");
});

test("the gallery builds on the shared uploader rather than duplicating it", () => {
  const gallery = find("modules/gallery/useGalleryUpload.js");

  assert.match(gallery.source, /useMediaUpload/, "should reuse the shared hook");
  assert.doesNotMatch(gallery.source, /uploadToCloudinary/, "no second copy of the upload flow");
  assert.match(gallery.source, /gallery\/images\/bulk/, "it still adds the attach step it needs");
});
