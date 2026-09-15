import assert from "node:assert/strict";
import { test } from "node:test";

import { failed, runBatch, succeeded, toRegisterBody } from "../src/lib/uploadBatch.js";

const tick = (ms = 1) => new Promise((r) => setTimeout(r, ms));

test("a failure in the batch does not lose the successes", async () => {
  // RTPP-45's second acceptance criterion, stated directly.
  const files = ["a", "b", "BAD", "d", "e"];

  const results = await runBatch(
    files,
    async (name) => {
      await tick();
      if (name === "BAD") throw new Error("upload rejected");
      return `${name}.jpg`;
    },
    { concurrency: 2 },
  );

  assert.equal(succeeded(results).length, 4);
  assert.equal(failed(results).length, 1);
  assert.deepEqual(
    succeeded(results).map((r) => r.value),
    ["a.jpg", "b.jpg", "d.jpg", "e.jpg"],
  );
  assert.match(failed(results)[0].error.message, /upload rejected/);
});

test("every item fails independently — one bad file never stops the pool", async () => {
  const results = await runBatch(
    [1, 2, 3, 4],
    async (n) => {
      if (n % 2 === 0) throw new Error(`no ${n}`);
      return n * 10;
    },
    { concurrency: 2 },
  );

  assert.deepEqual(
    results.map((r) => r.status),
    ["done", "failed", "done", "failed"],
  );
  assert.deepEqual(succeeded(results).map((r) => r.value), [10, 30]);
});

test("concurrency is actually bounded", async () => {
  let inFlight = 0;
  let peak = 0;

  await runBatch(
    Array.from({ length: 20 }, (_, i) => i),
    async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick(2);
      inFlight -= 1;
    },
    { concurrency: 3 },
  );

  assert.ok(peak <= 3, `expected at most 3 concurrent uploads, saw ${peak}`);
  assert.ok(peak > 1, "should genuinely run in parallel, not serially");
});

test("twenty items all complete", async () => {
  // The first acceptance criterion's scale. Nothing is dropped by the pool.
  const results = await runBatch(
    Array.from({ length: 20 }, (_, i) => i),
    async (i) => i,
    { concurrency: 4 },
  );

  assert.equal(results.length, 20);
  assert.equal(succeeded(results).length, 20);
  assert.deepEqual(succeeded(results).map((r) => r.value), [...Array(20).keys()]);
});

test("progress is reported per item, and finishes at 1", async () => {
  const seen = new Map();

  const results = await runBatch(
    ["x", "y"],
    async (_item, index, onProgress) => {
      onProgress(0.5);
      await tick();
      return index;
    },
    {
      concurrency: 1,
      onUpdate: (index, state) => {
        if (state.progress !== undefined) {
          seen.set(index, [...(seen.get(index) ?? []), state.progress]);
        }
      },
    },
  );

  assert.deepEqual(seen.get(0), [0.5, 1], "mid-flight then complete");
  assert.deepEqual(seen.get(1), [0.5, 1]);
  assert.equal(succeeded(results).length, 2);
});

test("states move pending -> running -> settled, and are reported", async () => {
  const states = [];
  await runBatch(["only"], async () => "ok", {
    onUpdate: (_index, state) => states.push(state.status),
  });

  assert.deepEqual(states, ["running", "done"]);
});

test("an empty batch resolves rather than hanging", async () => {
  const results = await runBatch([], async () => "never");
  assert.deepEqual(results, []);
});

test("the registration body sends version as a string", async () => {
  // Cloudinary reports version as a number, but only its text form took part in
  // the signature the API re-verifies — sending the number fails that check.
  const body = toRegisterBody({
    public_id: "rajdhani/gallery/abc",
    version: 1789450646,
    signature: "deadbeef",
    resource_type: "image",
    format: "jpg",
    bytes: 20481,
    secure_url: "https://res.cloudinary.com/x/image/upload/v1/abc.jpg",
    width: 1600,
    height: 900,
  });

  assert.strictEqual(body.version, "1789450646");
  assert.equal(typeof body.version, "string");
  assert.equal(body.bytes, 20481);
  assert.equal(body.width, 1600);
});

test("missing optional dimensions become null, not undefined", async () => {
  // A raw upload (a PDF) has no width or height; undefined would drop the keys
  // from the JSON body entirely.
  const body = toRegisterBody({
    public_id: "p",
    version: 1,
    signature: "s",
    resource_type: "raw",
    format: "pdf",
    bytes: 10,
    secure_url: "https://x/y.pdf",
  });

  assert.strictEqual(body.width, null);
  assert.strictEqual(body.height, null);
});
