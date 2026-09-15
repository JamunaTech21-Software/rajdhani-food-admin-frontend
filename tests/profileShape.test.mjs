import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  changedFields,
  hasChanges,
  logoAssets,
  toFormValues,
  WRITE_FIELDS,
} from "../src/modules/settings/profileShape.js";

// A realistic GET /admin/site-profile body, shaped as the Layout schema.
const PAYLOAD = {
  site: {
    name: "Rajdhani Food Products",
    tagline: "Premium quality tea",
    logos: {
      light: { id: "01JLIGHT", url: "https://cdn.example/light.png", alt: null },
      dark: null,
      favicon: { id: "01JFAV", url: "https://cdn.example/fav.png", alt: null },
      og: null,
    },
    theme: { primary: "#1B5E20", secondary: "#C9A227", accent: "#FFFFFF" },
    contact: {
      address_line: "12 Tea Garden Road",
      city: "Dhaka",
      country: "Bangladesh",
      phone_primary: "+8801700000000",
      phone_secondary: null,
      email_primary: "hello@rajdhanitea.com",
      email_secondary: null,
      website_url: "https://rajdhanifood.com",
      business_hours: "Sat–Thu, 9am–6pm",
    },
    map: { latitude: 23.8103, longitude: 90.4125, embed_url: null },
    footer: { about: "We have blended tea since 1979.", copyright: "© Rajdhani" },
    seo: { meta_title: "Rajdhani Tea", meta_description: "Premium tea from Bangladesh." },
  },
  menus: { header: [], footer_quick: [], footer_products: [], legal: [] },
  social: [],
};

test("the nested read flattens onto the flat write field names", () => {
  const values = toFormValues(PAYLOAD);

  // The pairs that do not share a stem are the ones that silently stop saving.
  assert.equal(values.primary_color, "#1B5E20", "theme.primary -> primary_color");
  assert.equal(values.copyright_text, "© Rajdhani", "footer.copyright -> copyright_text");
  assert.equal(values.footer_about, "We have blended tea since 1979.", "footer.about -> footer_about");
  assert.equal(values.map_latitude, "23.8103", "map.latitude -> map_latitude");
  assert.equal(values.address_line, "12 Tea Garden Road", "contact.address_line -> address_line");
  assert.equal(values.meta_title, "Rajdhani Tea", "seo.meta_title -> meta_title");
});

test("a logo reads as an object and writes as a bare id", () => {
  const values = toFormValues(PAYLOAD);

  assert.equal(values.logo_light_id, "01JLIGHT", "logos.light.id -> logo_light_id");
  assert.equal(values.favicon_id, "01JFAV", "logos.favicon -> favicon_id, not favicon_image_id");
  assert.equal(values.og_image_id, "", "logos.og is null -> empty");
});

test("every write field is produced by the read", () => {
  // A field present in the PATCH schema but missing here would never be
  // editable, and nobody would notice until someone asked why it won't save.
  const values = toFormValues(PAYLOAD);
  for (const field of WRITE_FIELDS) {
    assert.ok(field in values, `${field} is missing from the form values`);
  }
});

test("the form field list matches the PATCH schema exactly", () => {
  // Transcribed from SiteProfileUpdate in openapi.yaml. Drift in either
  // direction is a field that cannot be edited, or one the API will reject.
  const SCHEMA_FIELDS = [
    "name", "tagline",
    "logo_light_id", "logo_dark_id", "favicon_id", "og_image_id",
    "primary_color", "secondary_color", "accent_color",
    "address_line", "city", "country",
    "phone_primary", "phone_secondary", "email_primary", "email_secondary",
    "website_url", "business_hours",
    "map_latitude", "map_longitude", "map_embed_url",
    "footer_about", "copyright_text",
    "meta_title", "meta_description",
  ];

  assert.deepEqual([...WRITE_FIELDS].sort(), [...SCHEMA_FIELDS].sort());
});

test("nulls read as empty strings, since that is what an input holds", () => {
  const values = toFormValues(PAYLOAD);
  assert.equal(values.phone_secondary, "");
  assert.equal(values.map_embed_url, "");
  assert.equal(typeof values.map_latitude, "string", "numbers too — inputs hold strings");
});

test("the payload may be passed whole or already unwrapped", () => {
  assert.deepEqual(toFormValues(PAYLOAD), toFormValues(PAYLOAD.site));
});

test("a missing payload yields a complete blank form, not a crash", () => {
  for (const empty of [null, undefined, {}]) {
    const values = toFormValues(empty);
    assert.equal(Object.keys(values).length, WRITE_FIELDS.length);
    assert.ok(Object.values(values).every((v) => v === ""));
  }
});

test("only changed fields are sent", () => {
  const initial = toFormValues(PAYLOAD);
  const current = { ...initial, city: "Chattogram" };

  assert.deepEqual(changedFields(initial, current), { city: "Chattogram" });
  assert.deepEqual(changedFields(initial, initial), {}, "an untouched form sends nothing");
  assert.equal(hasChanges(initial, initial), false);
  assert.equal(hasChanges(initial, current), true);
});

test("an unchanged form never sends a colour someone else just changed", () => {
  // PATCH takes only what is changing. Sending the whole form would overwrite a
  // concurrent edit with values this page loaded minutes ago.
  const initial = toFormValues(PAYLOAD);
  const current = { ...initial, meta_title: "New title" };

  assert.deepEqual(Object.keys(changedFields(initial, current)), ["meta_title"]);
});

test("clearing a coordinate sends null, never 0", () => {
  // (0, 0) is a real place in the Gulf of Guinea. The spec is explicit that
  // unset is null, so a blank input must not be coerced to a number.
  const initial = toFormValues(PAYLOAD);
  const cleared = { ...initial, map_latitude: "", map_longitude: "" };

  assert.deepEqual(changedFields(initial, cleared), { map_latitude: null, map_longitude: null });
});

test("clearing a text field sends an empty string, which is what clears it", () => {
  const initial = toFormValues(PAYLOAD);
  const cleared = { ...initial, tagline: "" };

  assert.deepEqual(changedFields(initial, cleared), { tagline: "" });
});

test("removing a logo sends null rather than an empty string", () => {
  const initial = toFormValues(PAYLOAD);
  const cleared = { ...initial, logo_light_id: "" };

  assert.deepEqual(changedFields(initial, cleared), { logo_light_id: null });
});

test("whitespace-only input counts as clearing, not as a change to spaces", () => {
  const initial = toFormValues(PAYLOAD);

  assert.deepEqual(changedFields(initial, { ...initial, city: "   " }), { city: "" });
  // And padding an unchanged value is not a change at all.
  assert.deepEqual(changedFields(initial, { ...initial, city: "  Dhaka  " }), {});
});

test("a coordinate typed as text does not reach the API as NaN", () => {
  const initial = toFormValues(PAYLOAD);
  const bad = { ...initial, map_latitude: "north" };

  assert.deepEqual(changedFields(initial, bad), { map_latitude: null });
});

test("logo assets come back with their URLs for the picker to show", () => {
  const assets = logoAssets(PAYLOAD);

  assert.equal(assets.logo_light_id.url, "https://cdn.example/light.png");
  assert.equal(assets.logo_dark_id, null);
  assert.deepEqual(logoAssets(null).favicon_id, null, "a missing payload is tolerated");
});

test("the read paths are checked against the documented Layout shape", () => {
  // Guards the translation table itself: if the backend renames a nested key,
  // toFormValues would quietly return "" for it and the field would look empty
  // rather than broken.
  const spec = readFileSync(
    fileURLToPath(new URL("../../../backend/api/docs/openapi.yaml", import.meta.url)),
    "utf8",
  );
  const siteProfile = spec.slice(spec.indexOf("    SiteProfile:"), spec.indexOf("    MenuLink:"));

  for (const key of ["address_line", "phone_secondary", "business_hours", "embed_url", "copyright", "meta_description"]) {
    assert.ok(siteProfile.includes(`${key}:`), `SiteProfile no longer documents ${key}`);
  }
});
