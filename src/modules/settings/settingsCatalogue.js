/**
 * The `settings` key/value rows, described.
 *
 * `PUT /admin/settings` only ever updates an *existing* key — the allowlist is
 * populated by `SettingsSeeder`, and an unknown key is a 422 rather than a new
 * row. So this catalogue is not a suggestion: a key misspelled here is a
 * setting that cannot be saved. `tests/settingsCatalogue.test.mjs` reads the
 * seeder and fails if the two drift.
 *
 * Every value is stored as a string (the table has no type column), so `kind`
 * is this app's interpretation and each one round-trips through a string.
 */

import { emailListError, normaliseEmails } from "./emailList.js";

export const GROUPS = [
  {
    id: "notifications",
    label: "Notifications",
    description:
      "Who is emailed when someone submits a form. Leave a list empty to fall back to the primary contact email.",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Tracking ids used by the customer site. Leave blank to load nothing.",
  },
  {
    id: "general",
    label: "General",
    description: "Behaviour of the customer site that is not content.",
  },
];

export const SETTINGS = [
  {
    key: "enquiry_notify_emails",
    group: "notifications",
    kind: "emails",
    label: "Product enquiries",
  },
  {
    key: "dealer_notify_emails",
    group: "notifications",
    kind: "emails",
    label: "Dealer applications",
  },
  {
    key: "contact_notify_emails",
    group: "notifications",
    kind: "emails",
    label: "Contact messages",
  },
  {
    key: "newsletter_notify_emails",
    group: "notifications",
    kind: "emails",
    label: "Newsletter sign-ups",
  },

  {
    key: "gtm_id",
    group: "analytics",
    kind: "text",
    label: "Google Tag Manager ID",
    placeholder: "GTM-XXXXXXX",
  },
  {
    key: "ga4_measurement_id",
    group: "analytics",
    kind: "text",
    label: "GA4 measurement ID",
    placeholder: "G-XXXXXXXXXX",
  },
  {
    key: "facebook_pixel_id",
    group: "analytics",
    kind: "text",
    label: "Facebook Pixel ID",
  },

  {
    key: "newsletter_enabled",
    group: "general",
    kind: "boolean",
    label: "Show the newsletter sign-up in the footer",
  },
  {
    key: "reviews_require_approval",
    group: "general",
    kind: "boolean",
    label: "Hold new reviews for approval",
    hint: "Off publishes every review the moment it is submitted.",
  },
  {
    key: "maintenance_mode",
    group: "general",
    kind: "boolean",
    label: "Maintenance mode",
    hint: "Takes the customer site offline for visitors. This dashboard stays reachable.",
    tone: "danger",
  },
  {
    key: "products_per_page",
    group: "general",
    kind: "integer",
    label: "Products per page",
    min: 1,
    max: 100,
  },
  {
    key: "news_per_page",
    group: "general",
    kind: "integer",
    label: "News posts per page",
    min: 1,
    max: 100,
  },
  {
    key: "gallery_images_per_page",
    group: "general",
    kind: "integer",
    label: "Gallery images per page",
    min: 1,
    max: 100,
  },
  {
    key: "dealer_application_response_window",
    group: "general",
    kind: "text",
    label: "Dealer reply window",
    hint: "Shown in the confirmation after someone applies.",
    placeholder: "2-3 business days",
  },
  {
    key: "recaptcha_score_threshold",
    group: "general",
    kind: "decimal",
    label: "reCAPTCHA score threshold",
    hint: "0 lets everything through, 1 blocks all but the most certainly human. 0.5 is conventional.",
    min: 0,
    max: 1,
    step: 0.1,
  },
];

export const SETTING_KEYS = SETTINGS.map((s) => s.key);

const BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

export const settingFor = (key) => BY_KEY.get(key) ?? null;

export const settingsInGroup = (group) => SETTINGS.filter((s) => s.group === group);

/** The rows from `GET /admin/settings` as `{ key: value }` form state. */
export function toFormValues(rows) {
  const byKey = new Map((rows ?? []).map((row) => [row.key, row.value ?? ""]));
  // Keys this app does not know about are ignored rather than dropped — the PUT
  // only sends what changed, so an unknown row is left exactly as it was.
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, byKey.get(key) ?? ""]));
}

/** A boolean setting is "1" or "0" in the table, never true/false. */
export const isOn = (value) => value === "1" || value === 1 || value === true;

export const fromBoolean = (checked) => (checked ? "1" : "0");

/** Normalise one value into exactly what should be stored for its kind. */
export function toStoredValue(key, value) {
  const setting = settingFor(key);
  const raw = typeof value === "string" ? value.trim() : value;

  switch (setting?.kind) {
    case "emails":
      return normaliseEmails(raw);
    case "boolean":
      return fromBoolean(isOn(raw));
    case "integer": {
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? String(n) : "";
    }
    case "decimal": {
      const n = Number(raw);
      return Number.isFinite(n) ? String(n) : "";
    }
    default:
      return raw === null || raw === undefined ? "" : String(raw);
  }
}

/** A message for one value, or null. */
export function settingError(key, value) {
  const setting = settingFor(key);
  if (!setting) return null;

  const raw = typeof value === "string" ? value.trim() : value;

  if (setting.kind === "emails") return emailListError(raw);

  if (setting.kind === "integer" || setting.kind === "decimal") {
    if (raw === "" || raw === null || raw === undefined) return "This needs a number";
    const n = Number(raw);
    if (!Number.isFinite(n)) return "This needs a number";
    if (setting.kind === "integer" && !Number.isInteger(n)) return "Whole numbers only";
    if (setting.min !== undefined && n < setting.min) return `Must be at least ${setting.min}`;
    if (setting.max !== undefined && n > setting.max) return `Must be at most ${setting.max}`;
  }

  return null;
}

/**
 * The `{ settings: [{key, value}] }` body, carrying only what changed.
 *
 * The endpoint takes `minItems: 1`, so an unchanged form must not be submitted
 * at all — the caller checks for an empty array first.
 */
export function changedSettings(initial, current) {
  const changed = [];

  for (const key of SETTING_KEYS) {
    const before = toStoredValue(key, initial?.[key]);
    const after = toStoredValue(key, current?.[key]);
    if (before !== after) changed.push({ key, value: after });
  }

  return changed;
}

/** Every message for the current form, as `{ key: message }`. */
export function settingsErrors(values) {
  const errors = {};
  for (const key of SETTING_KEYS) {
    const message = settingError(key, values?.[key]);
    if (message) errors[key] = message;
  }
  return errors;
}
