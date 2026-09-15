import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatChartDay,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
} from "../src/lib/format.js";


// The API sends this shape, observed live from GET /auth/admin/me.
const API_TIMESTAMP = "2026-09-15 06:03:09.869";
// And this shape in the dashboard chart series.
const API_CHART_DAY = "2026-08-17";

test("the API's space-separated timestamp is read as UTC and shown in Asia/Dhaka", () => {
  // 06:03 UTC is 12:03 in Dhaka (+06:00).
  const out = formatDateTime(API_TIMESTAMP);
  assert.match(out, /12:03/, `expected 12:03 Dhaka time, got "${out}"`);
  assert.match(out, /15 Sept.? 2026/, `expected the date, got "${out}"`);
});

test("a date-only chart day formats without becoming Invalid Date", () => {
  const out = formatChartDay(API_CHART_DAY);
  assert.notEqual(out, "", "chart axis label must not be empty");
  assert.match(out, /17 Aug/, `expected "17 Aug", got "${out}"`);
});

test("an ISO timestamp with an offset is respected, not double-converted", () => {
  const out = formatDateTime("2026-09-15T06:00:59+00:00");
  assert.match(out, /12:00/, `expected 12:00 Dhaka time, got "${out}"`);
});

test("a Z-suffixed timestamp works too", () => {
  assert.match(formatDateTime("2026-09-15T06:00:59Z"), /12:00/);
});

test("null and rubbish degrade to an em dash, never 'Invalid Date'", () => {
  for (const value of [null, undefined, "", "not-a-date"]) {
    assert.equal(formatDate(value), "—", `formatDate(${JSON.stringify(value)})`);
    assert.equal(formatDateTime(value), "—", `formatDateTime(${JSON.stringify(value)})`);
  }
  assert.equal(formatChartDay(null), "");
});

test("relative time reads naturally around the boundaries", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");
  const ago = (ms) => formatRelative(new Date(now - ms).toISOString(), now);

  assert.equal(ago(5_000), "just now");
  assert.equal(ago(90_000), "1 minute ago");
  assert.equal(ago(3 * 3600_000), "3 hours ago");
  assert.equal(ago(26 * 3600_000), "yesterday");
  assert.equal(ago(9 * 86400_000), "last week");
});

test("numbers are grouped", () => {
  assert.equal(formatNumber(1234567), "1,234,567");
  assert.equal(formatNumber(0), "0");
  assert.equal(formatNumber(null), "0", "a missing count renders as zero, not NaN");
});

