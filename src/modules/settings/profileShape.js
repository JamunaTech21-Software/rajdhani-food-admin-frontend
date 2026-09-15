/**
 * The site profile reads nested and writes flat.
 *
 * `GET /admin/site-profile` returns a `Layout`: `site.contact.address_line`,
 * `site.theme.primary`, `site.logos.light` (an `{id, url}` object). `PATCH`
 * takes a flat body with different names again: `address_line`, `primary_color`,
 * `logo_light_id`. Several pairs do not even share a stem — `theme.primary` →
 * `primary_color`, `footer.copyright` → `copyright_text`, `logos.og` →
 * `og_image_id`.
 *
 * Doing that translation inline in a form component is how a field silently
 * stops saving, so it lives here, as data, with tests.
 */

/** [read path, write field, kind] — kind drives how a blank value is cleared. */
const FIELDS = [
  [["name"], "name", "text"],
  [["tagline"], "tagline", "text"],

  [["logos", "light"], "logo_light_id", "media"],
  [["logos", "dark"], "logo_dark_id", "media"],
  [["logos", "favicon"], "favicon_id", "media"],
  [["logos", "og"], "og_image_id", "media"],

  [["theme", "primary"], "primary_color", "colour"],
  [["theme", "secondary"], "secondary_color", "colour"],
  [["theme", "accent"], "accent_color", "colour"],

  [["contact", "address_line"], "address_line", "text"],
  [["contact", "city"], "city", "text"],
  [["contact", "country"], "country", "text"],
  [["contact", "phone_primary"], "phone_primary", "text"],
  [["contact", "phone_secondary"], "phone_secondary", "text"],
  [["contact", "email_primary"], "email_primary", "text"],
  [["contact", "email_secondary"], "email_secondary", "text"],
  [["contact", "website_url"], "website_url", "text"],
  [["contact", "business_hours"], "business_hours", "text"],

  [["map", "latitude"], "map_latitude", "number"],
  [["map", "longitude"], "map_longitude", "number"],
  [["map", "embed_url"], "map_embed_url", "text"],

  [["footer", "about"], "footer_about", "text"],
  [["footer", "copyright"], "copyright_text", "text"],

  [["seo", "meta_title"], "meta_title", "text"],
  [["seo", "meta_description"], "meta_description", "text"],
];

export const WRITE_FIELDS = FIELDS.map(([, field]) => field);

export const KIND_OF = Object.fromEntries(FIELDS.map(([, field, kind]) => [field, kind]));

const at = (source, path) => path.reduce((value, key) => value?.[key], source);

/**
 * Flatten the payload into form values.
 *
 * Accepts the whole `Layout`, or its `site` object, so it does not matter
 * whether the caller unwrapped it. Every value becomes a string because that is
 * what an input holds; `null` becomes `""`.
 */
export function toFormValues(payload) {
  const site = payload?.site ?? payload ?? {};
  const values = {};

  for (const [path, field, kind] of FIELDS) {
    const raw = at(site, path);
    // A media field reads as {id, url} but writes as a bare id.
    const value = kind === "media" ? raw?.id : raw;
    values[field] = value === null || value === undefined ? "" : String(value);
  }

  return values;
}

/** The thumbnails the read gave us, so the picker shows an image not an id. */
export function logoAssets(payload) {
  const logos = (payload?.site ?? payload ?? {}).logos ?? {};
  return {
    logo_light_id: logos.light ?? null,
    logo_dark_id: logos.dark ?? null,
    favicon_id: logos.favicon ?? null,
    og_image_id: logos.og ?? null,
  };
}

/**
 * Turn one form value into what the API should store.
 *
 * Blank clears the field, but *how* depends on the type. A coordinate must clear
 * to `null`: the spec is explicit that unset is null and not 0, because (0, 0)
 * is a real place in the Gulf of Guinea and would drop a pin there.
 */
function toApiValue(field, value) {
  const kind = KIND_OF[field];
  const trimmed = typeof value === "string" ? value.trim() : value;

  if (trimmed === "" || trimmed === null || trimmed === undefined) {
    return kind === "number" || kind === "media" ? null : "";
  }
  if (kind === "number") {
    const number = Number(trimmed);
    return Number.isFinite(number) ? number : null;
  }
  return trimmed;
}

/**
 * Only what changed, as the PATCH body.
 *
 * `PATCH /admin/site-profile` has `minProperties: 1` and takes "only the fields
 * you are changing". Sending the whole form on every save would also mean one
 * person editing the contact block overwrites a colour someone else just
 * changed, using values their page loaded minutes ago.
 */
export function changedFields(initial, current) {
  const body = {};

  for (const field of WRITE_FIELDS) {
    const before = toApiValue(field, initial?.[field]);
    const after = toApiValue(field, current?.[field]);
    if (before !== after) body[field] = after;
  }

  return body;
}

export const hasChanges = (initial, current) =>
  Object.keys(changedFields(initial, current)).length > 0;
