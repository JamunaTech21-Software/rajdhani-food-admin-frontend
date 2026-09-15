import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  emailListError,
  formatEmails,
  invalidEmails,
  normaliseEmails,
  parseEmails,
} from "../src/modules/settings/emailList.js";
import {
  changedSettings,
  GROUPS,
  isOn,
  SETTING_KEYS,
  SETTINGS,
  settingError,
  settingsErrors,
  settingsInGroup,
  toFormValues,
  toStoredValue,
} from "../src/modules/settings/settingsCatalogue.js";

test("every key in the catalogue exists in the seeder's allowlist", () => {
  // PUT /admin/settings refuses a key the seeder never created — a 422, not a
  // new row. A key misspelled in the catalogue is a setting that cannot save.
  const seeder = readFileSync(
    fileURLToPath(new URL("../../../backend/api/database/seeders/SettingsSeeder.php", import.meta.url)),
    "utf8",
  );
  const defaults = seeder.slice(seeder.indexOf("private const DEFAULTS"), seeder.indexOf("public function tables"));
  const seeded = [...defaults.matchAll(/'([a-z0-9_]+)'\s*=>\s*\[/g)].map((m) => m[1]);

  assert.ok(seeded.length > 10, "the seeder was not parsed as expected");

  for (const key of SETTING_KEYS) {
    assert.ok(seeded.includes(key), `"${key}" is not a key the seeder creates`);
  }
});

test("the catalogue covers every seeded key, so nothing is uneditable", () => {
  const seeder = readFileSync(
    fileURLToPath(new URL("../../../backend/api/database/seeders/SettingsSeeder.php", import.meta.url)),
    "utf8",
  );
  const defaults = seeder.slice(seeder.indexOf("private const DEFAULTS"), seeder.indexOf("public function tables"));
  const seeded = [...defaults.matchAll(/'([a-z0-9_]+)'\s*=>\s*\[/g)].map((m) => m[1]);

  for (const key of seeded) {
    assert.ok(SETTING_KEYS.includes(key), `"${key}" is seeded but has no UI — it can never be changed`);
  }
});

test("every setting belongs to a group that exists", () => {
  const ids = GROUPS.map((g) => g.id);
  for (const setting of SETTINGS) {
    assert.ok(ids.includes(setting.group), `${setting.key} is in unknown group "${setting.group}"`);
  }
  for (const group of GROUPS) {
    assert.ok(settingsInGroup(group.id).length > 0, `group "${group.id}" would render empty`);
  }
});

test("rows from the API become form values, keyed by setting", () => {
  const rows = [
    { key: "gtm_id", value: "GTM-ABC123", group: "analytics" },
    { key: "newsletter_enabled", value: "1", group: "general" },
    { key: "some_future_key", value: "x", group: "general" },
  ];
  const values = toFormValues(rows);

  assert.equal(values.gtm_id, "GTM-ABC123");
  assert.equal(values.newsletter_enabled, "1");
  assert.equal(values.enquiry_notify_emails, "", "a row the API did not return reads as empty");
  assert.ok(!("some_future_key" in values), "a key this app does not know is ignored, not surfaced");
});

test("booleans round-trip as the strings the table actually stores", () => {
  assert.equal(isOn("1"), true);
  assert.equal(isOn("0"), false);
  assert.equal(isOn(""), false);
  assert.equal(toStoredValue("newsletter_enabled", true), "1");
  assert.equal(toStoredValue("newsletter_enabled", false), "0");
  assert.equal(toStoredValue("maintenance_mode", "1"), "1", "no true/false reaches the API");
});

test("only changed settings are sent", () => {
  const initial = toFormValues([{ key: "gtm_id", value: "GTM-OLD" }]);
  const current = { ...initial, gtm_id: "GTM-NEW" };

  assert.deepEqual(changedSettings(initial, current), [{ key: "gtm_id", value: "GTM-NEW" }]);
  assert.deepEqual(changedSettings(initial, initial), [], "an untouched form sends nothing");
});

test("a reformatted email list that means the same thing is not a change", () => {
  // Otherwise every save rewrites every list and fills the audit log with noise.
  const initial = toFormValues([{ key: "enquiry_notify_emails", value: "a@x.com, b@x.com" }]);
  const retyped = { ...initial, enquiry_notify_emails: "a@x.com,   b@x.com  " };

  assert.deepEqual(changedSettings(initial, retyped), []);
});

test("numbers are normalised before comparison", () => {
  const initial = toFormValues([{ key: "products_per_page", value: "12" }]);

  assert.deepEqual(changedSettings(initial, { ...initial, products_per_page: " 12 " }), []);
  assert.deepEqual(changedSettings(initial, { ...initial, products_per_page: "24" }), [
    { key: "products_per_page", value: "24" },
  ]);
});

test("a number out of range is reported, not silently clamped", () => {
  assert.equal(settingError("products_per_page", "0"), "Must be at least 1");
  assert.equal(settingError("products_per_page", "500"), "Must be at most 100");
  assert.equal(settingError("products_per_page", "12"), null);
  assert.equal(settingError("products_per_page", "abc"), "This needs a number");
  assert.equal(settingError("products_per_page", ""), "This needs a number");
  assert.equal(settingError("products_per_page", "12.5"), "Whole numbers only");
});

test("the reCAPTCHA threshold accepts a decimal within 0 and 1", () => {
  assert.equal(settingError("recaptcha_score_threshold", "0.5"), null);
  assert.equal(settingError("recaptcha_score_threshold", "0"), null);
  assert.equal(settingError("recaptcha_score_threshold", "1"), null);
  assert.equal(settingError("recaptcha_score_threshold", "1.5"), "Must be at most 1");
  assert.equal(settingError("recaptcha_score_threshold", "-0.1"), "Must be at least 0");
});

test("an empty recipient list is valid, because empty means something", () => {
  // The seeder's note: empty falls back to site_profile.email_primary. Treating
  // it as an error would force a value nobody asked for.
  assert.equal(settingError("enquiry_notify_emails", ""), null);
  assert.equal(emailListError(""), null);
  assert.deepEqual(invalidEmails(""), []);
});

test("a bad address in a list is named", () => {
  const message = settingError("enquiry_notify_emails", "sales@x.com, not-an-email");

  assert.match(message, /not-an-email/);
  assert.doesNotMatch(message, /sales@x.com/, "the good one is not blamed");
});

test("email lists tolerate the separators people actually type", () => {
  assert.deepEqual(parseEmails("a@x.com, b@x.com"), ["a@x.com", "b@x.com"]);
  assert.deepEqual(parseEmails("a@x.com;b@x.com"), ["a@x.com", "b@x.com"]);
  assert.deepEqual(parseEmails("a@x.com\nb@x.com"), ["a@x.com", "b@x.com"]);
  assert.deepEqual(parseEmails("a@x.com,  ,b@x.com,"), ["a@x.com", "b@x.com"], "blanks dropped");
  assert.deepEqual(parseEmails(null), []);
});

test("the same person twice is stored once", () => {
  // Two copies in the list means two copies of every notification email.
  assert.equal(formatEmails(["a@x.com", "A@X.com", "b@x.com"]), "a@x.com, b@x.com");
  assert.equal(normaliseEmails("a@x.com, a@x.com"), "a@x.com");
});

test("obvious mistakes are caught, ordinary addresses are not", () => {
  for (const good of ["a@x.com", "first.last@sub.example.co.uk", "sales+tea@rajdhani.com"]) {
    assert.deepEqual(invalidEmails(good), [], `${good} should be accepted`);
  }
  for (const bad of ["plainword", "no@domain", "@x.com", "a@.com"]) {
    assert.deepEqual(invalidEmails(bad), [bad], `${bad} should be rejected`);
  }
});

test("errors are collected per key for the form to render", () => {
  const errors = settingsErrors({
    enquiry_notify_emails: "bad",
    products_per_page: "12",
    news_per_page: "0",
  });

  assert.ok(errors.enquiry_notify_emails);
  assert.ok(errors.news_per_page);
  assert.ok(!("products_per_page" in errors));
});
