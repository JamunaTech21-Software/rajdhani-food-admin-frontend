import assert from "node:assert/strict";
import { test } from "node:test";

import { hasInvalidWindow, scheduleState } from "../src/lib/bannerSchedule.js";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../src/lib/format.js";

const NOW = Date.parse("2026-09-15T12:00:00Z");
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const DAY = 86_400_000;

test("status wins before the window is even consulted", () => {
  // A draft with a live window is still not on the site.
  assert.equal(
    scheduleState({ status: "DRAFT", starts_at: iso(-DAY), ends_at: iso(DAY) }, NOW),
    "draft",
  );
  assert.equal(
    scheduleState({ status: "ARCHIVED", starts_at: iso(-DAY), ends_at: iso(DAY) }, NOW),
    "archived",
  );
});

test("a published banner with no bounds is live", () => {
  assert.equal(scheduleState({ status: "PUBLISHED", starts_at: null, ends_at: null }, NOW), "live");
});

test("a future start reads as scheduled, not live", () => {
  // This is the case a plain "Published" badge gets wrong.
  assert.equal(
    scheduleState({ status: "PUBLISHED", starts_at: iso(DAY), ends_at: null }, NOW),
    "scheduled",
  );
});

test("a past end reads as expired, not live", () => {
  assert.equal(
    scheduleState({ status: "PUBLISHED", starts_at: iso(-2 * DAY), ends_at: iso(-DAY) }, NOW),
    "expired",
  );
});

test("inside the window is live", () => {
  assert.equal(
    scheduleState({ status: "PUBLISHED", starts_at: iso(-DAY), ends_at: iso(DAY) }, NOW),
    "live",
  );
});

test("expiry is checked before the start, so a stale window is never 'scheduled'", () => {
  // Both bounds in the past: the honest answer is expired.
  assert.equal(
    scheduleState({ status: "PUBLISHED", starts_at: iso(-3 * DAY), ends_at: iso(-DAY) }, NOW),
    "expired",
  );
});

test("the boundary instants themselves", () => {
  // Starting exactly now is live; ending exactly now is over.
  assert.equal(scheduleState({ status: "PUBLISHED", starts_at: iso(0) }, NOW), "live");
  assert.equal(scheduleState({ status: "PUBLISHED", ends_at: iso(0) }, NOW), "expired");
});

test("the API's space-separated timestamps are understood here too", () => {
  assert.equal(
    scheduleState({ status: "PUBLISHED", starts_at: "2026-09-16 12:00:00.000" }, NOW),
    "scheduled",
  );
});

test("an end before the start is flagged as an impossible window", () => {
  assert.equal(hasInvalidWindow(iso(DAY), iso(-DAY)), true);
  assert.equal(hasInvalidWindow(iso(0), iso(0)), true, "a zero-length window is useless");
  assert.equal(hasInvalidWindow(iso(-DAY), iso(DAY)), false);
  assert.equal(hasInvalidWindow(null, iso(DAY)), false, "an open start is fine");
  assert.equal(hasInvalidWindow(iso(-DAY), null), false, "an open end is fine");
});

test("datetime inputs are Dhaka wall time, not UTC and not the browser's zone", () => {
  // 12:00 UTC is 18:00 in Dhaka (+06:00).
  assert.equal(toDateTimeLocalInput("2026-09-15T12:00:00Z"), "2026-09-15T18:00");
});

test("typing a Dhaka time gives back the right UTC instant", () => {
  assert.equal(fromDateTimeLocalInput("2026-09-15T18:00"), "2026-09-15T12:00:00.000Z");
});

test("the conversion round-trips", () => {
  for (const original of [
    "2026-01-01T00:00:00.000Z",
    "2026-06-30T23:45:00.000Z",
    "2026-12-31T18:15:00.000Z",
  ]) {
    const roundTripped = fromDateTimeLocalInput(toDateTimeLocalInput(original));
    assert.equal(roundTripped, original, `round trip failed for ${original}`);
  }
});

test("a midnight Dhaka time does not slip to the previous day", () => {
  // The classic off-by-one: 00:00 in Dhaka is 18:00 UTC the day before.
  assert.equal(fromDateTimeLocalInput("2026-09-15T00:00"), "2026-09-14T18:00:00.000Z");
  assert.equal(toDateTimeLocalInput("2026-09-14T18:00:00Z"), "2026-09-15T00:00");
});

test("blank and malformed scheduling inputs are null, not Invalid Date", () => {
  assert.equal(fromDateTimeLocalInput(""), null);
  assert.equal(fromDateTimeLocalInput(null), null);
  assert.equal(fromDateTimeLocalInput("not a date"), null);
  assert.equal(toDateTimeLocalInput(null), "");
  assert.equal(toDateTimeLocalInput("rubbish"), "");
});
