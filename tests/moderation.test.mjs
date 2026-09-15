import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bulkModerate,
  reconcile,
  selectionState,
  toggleAllOnPage,
  toggleSelected,
} from "../src/modules/reviews/moderation.js";

const rows = (...ids) => ids.map((id) => ({ id }));

function spy() {
  const calls = [];
  const request = async (path, body) => {
    calls.push({ path, body });
    return { updated: body.ids.length };
  };
  return { calls, request };
}

test("bulk approving twenty reviews is ONE request", async () => {
  // RTPP-47's second acceptance criterion, stated directly.
  const ids = Array.from({ length: 20 }, (_, i) => `r${i}`);
  const { calls, request } = spy();

  const result = await bulkModerate({ ids, action: "approve", request });

  assert.equal(calls.length, 1, `expected exactly one request, made ${calls.length}`);
  assert.equal(calls[0].path, "/admin/reviews/bulk-approve");
  assert.equal(calls[0].body.ids.length, 20);
  assert.equal(result.updated, 20);
});

test("bulk rejecting is one request and carries the shared reason", async () => {
  const { calls, request } = spy();
  await bulkModerate({ ids: ["a", "b"], action: "reject", reason: "  Off topic  ", request });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/admin/reviews/bulk-reject");
  assert.deepEqual(calls[0].body.ids, ["a", "b"]);
  assert.equal(calls[0].body.reason, "Off topic", "trimmed before sending");
});

test("a rejection without a reason never reaches the API", async () => {
  // The API requires it; failing here names the problem instead of surfacing a 422.
  const { calls, request } = spy();

  await assert.rejects(
    async () => bulkModerate({ ids: ["a"], action: "reject", reason: "   ", request }),
    /needs a reason/i,
  );
  await assert.rejects(
    async () => bulkModerate({ ids: ["a"], action: "reject", request }),
    /needs a reason/i,
  );
  assert.equal(calls.length, 0, "nothing should be sent");
});

test("duplicate ids are collapsed", async () => {
  const { calls, request } = spy();
  await bulkModerate({ ids: ["a", "a", "b", "a"], action: "approve", request });
  assert.deepEqual(calls[0].body.ids, ["a", "b"]);
});

test("an empty selection is refused before any request", async () => {
  const { calls, request } = spy();
  await assert.rejects(async () => bulkModerate({ ids: [], action: "approve", request }), /at least one/i);
  assert.equal(calls.length, 0);
});

test("an unknown action is refused rather than guessed at", async () => {
  const { calls, request } = spy();
  await assert.rejects(
    async () => bulkModerate({ ids: ["a"], action: "delete", request }),
    /Unknown moderation action/,
  );
  assert.equal(calls.length, 0);
});

test("toggling one id adds then removes it", () => {
  let selected = new Set();
  selected = toggleSelected(selected, "a");
  assert.deepEqual([...selected], ["a"]);
  selected = toggleSelected(selected, "a");
  assert.deepEqual([...selected], []);
});

test("select-all covers the page, and toggles off when the page is fully chosen", () => {
  const page = rows("a", "b", "c");

  const all = toggleAllOnPage(new Set(), page);
  assert.deepEqual([...all].sort(), ["a", "b", "c"]);

  const none = toggleAllOnPage(all, page);
  assert.deepEqual([...none], []);
});

test("select-all does not disturb selections from another page", () => {
  // Selecting page two must not silently drop what was chosen on page one.
  const carried = new Set(["from-page-one"]);
  const next = toggleAllOnPage(carried, rows("a", "b"));

  assert.deepEqual([...next].sort(), ["a", "b", "from-page-one"]);
});

test("a partly-selected page selects the rest rather than clearing", () => {
  const partial = new Set(["a"]);
  const next = toggleAllOnPage(partial, rows("a", "b", "c"));
  assert.deepEqual([...next].sort(), ["a", "b", "c"]);
});

test("selection is reconciled against what is on screen", () => {
  // Changing the filter leaves ids behind; acting on them would moderate rows
  // the editor can no longer see.
  const stale = new Set(["a", "gone", "b"]);
  assert.deepEqual([...reconcile(stale, rows("a", "b", "c"))].sort(), ["a", "b"]);
  assert.deepEqual([...reconcile(stale, [])], []);
});

test("selectionState drives the header checkbox", () => {
  const page = rows("a", "b");
  assert.equal(selectionState(new Set(), page), "none");
  assert.equal(selectionState(new Set(["a"]), page), "some");
  assert.equal(selectionState(new Set(["a", "b"]), page), "all");
  assert.equal(selectionState(new Set(["a"]), []), "none", "an empty page is never 'all'");
});
