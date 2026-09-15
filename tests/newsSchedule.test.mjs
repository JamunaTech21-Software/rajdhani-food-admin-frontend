import assert from "node:assert/strict";
import { test } from "node:test";

import { isPubliclyVisible, newsState } from "../src/lib/newsSchedule.js";

const NOW = Date.parse("2026-09-15T12:00:00Z");
const at = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const HOUR = 3_600_000;

test("a future publish date reads Scheduled, not Published", () => {
  // RTPP-46's first acceptance criterion. A green "Published" badge on a post
  // no reader can reach tells the editor the opposite of the truth.
  assert.equal(
    newsState({ status: "PUBLISHED", published_at: at(HOUR) }, NOW),
    "scheduled",
  );
});

test("a past publish date is live", () => {
  assert.equal(newsState({ status: "PUBLISHED", published_at: at(-HOUR) }, NOW), "published");
});

test("PUBLISHED with no date is live — the server stamps it at publish time", () => {
  assert.equal(newsState({ status: "PUBLISHED", published_at: null }, NOW), "published");
});

test("status wins over the date", () => {
  // A draft with a past publish date is still a draft.
  assert.equal(newsState({ status: "DRAFT", published_at: at(-HOUR) }, NOW), "draft");
  assert.equal(newsState({ status: "ARCHIVED", published_at: at(-HOUR) }, NOW), "archived");
  // And a draft dated in the future is a draft, not "scheduled" — nothing is
  // scheduled until someone actually sets the status.
  assert.equal(newsState({ status: "DRAFT", published_at: at(HOUR) }, NOW), "draft");
});

test("the publish instant itself is live, not scheduled", () => {
  assert.equal(newsState({ status: "PUBLISHED", published_at: at(0) }, NOW), "published");
});

test("the API's space-separated timestamps are understood", () => {
  assert.equal(
    newsState({ status: "PUBLISHED", published_at: "2026-09-16 12:00:00.000" }, NOW),
    "scheduled",
  );
  assert.equal(
    newsState({ status: "PUBLISHED", published_at: "2026-09-14 12:00:00.000" }, NOW),
    "published",
  );
});

test("only a live post offers a link to the public site", () => {
  // A scheduled post's URL would 404 for the editor clicking it.
  assert.equal(isPubliclyVisible({ status: "PUBLISHED", published_at: at(-HOUR) }, NOW), true);
  assert.equal(isPubliclyVisible({ status: "PUBLISHED", published_at: at(HOUR) }, NOW), false);
  assert.equal(isPubliclyVisible({ status: "DRAFT", published_at: null }, NOW), false);
  assert.equal(isPubliclyVisible({ status: "ARCHIVED", published_at: at(-HOUR) }, NOW), false);
});

test("a malformed date does not crash the list", () => {
  // Falls back to "published" rather than throwing mid-render.
  assert.equal(newsState({ status: "PUBLISHED", published_at: "not a date" }, NOW), "published");
  assert.equal(newsState({}, NOW), "published");
  assert.equal(newsState(null, NOW), "published");
});
