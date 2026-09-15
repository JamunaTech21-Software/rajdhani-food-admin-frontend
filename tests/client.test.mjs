import assert from "node:assert/strict";
import { test } from "node:test";

import { createApiClient, unwrapList } from "../../shared/api/client.js";
import { ApiError } from "../../shared/api/errors.js";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const ok = (data) => json({ success: true, data });
const fail = (code, status, details) =>
  json({ success: false, error: { code, message: `${code} happened`, details } }, status);


// 1 — 401 triggers exactly one refresh and replays the original request
await test("401 -> refresh -> replay, once", async () => {
  const calls = [];
  let token = "stale";
  globalThis.fetch = async (url, init) => {
    calls.push(`${init.method} ${new URL(url).pathname} auth=${init.headers.Authorization ?? "-"}`);
    if (new URL(url).pathname.endsWith("/products")) {
      return init.headers.Authorization === "Bearer fresh" ? ok([{ id: 1 }]) : fail("TOKEN_EXPIRED", 401);
    }
    throw new Error("unexpected");
  };

  let refreshes = 0;
  const api = createApiClient({
    baseUrl: "https://api.test/api/v1",
    getAccessToken: () => token,
    refreshSession: async () => {
      refreshes++;
      token = "fresh";
      return token;
    },
  });

  const data = await api.get("/products");
  assert.deepEqual(data, [{ id: 1 }]);
  assert.equal(refreshes, 1, "refresh should run exactly once");
  assert.equal(calls.length, 2, "original request plus one replay");
  assert.match(calls[0], /auth=Bearer stale/);
  assert.match(calls[1], /auth=Bearer fresh/);
});

// 2 — a failed refresh surfaces the error and signals auth failure once
await test("failed refresh -> onAuthFailure, no infinite retry", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    return fail("TOKEN_EXPIRED", 401);
  };

  let authFailures = 0;
  const api = createApiClient({
    baseUrl: "https://api.test/api/v1",
    getAccessToken: () => "stale",
    refreshSession: async () => null,
    onAuthFailure: () => authFailures++,
  });

  await assert.rejects(() => api.get("/products"), (e) => e instanceof ApiError && e.isAuth);
  assert.equal(attempts, 1, "must not replay when refresh fails");
  assert.equal(authFailures, 1);
});

// 3 — concurrent 401s share ONE refresh (rotation reuse would revoke the family)
await test("concurrent 401s single-flight the refresh", async () => {
  let token = "stale";
  globalThis.fetch = async (url, init) =>
    init.headers.Authorization === "Bearer fresh" ? ok({ n: 1 }) : fail("TOKEN_EXPIRED", 401);

  let refreshes = 0;
  const api = createApiClient({
    baseUrl: "https://api.test/api/v1",
    getAccessToken: () => token,
    refreshSession: async () => {
      refreshes++;
      await new Promise((r) => setTimeout(r, 10));
      token = "fresh";
      return token;
    },
  });

  await Promise.all([api.get("/a"), api.get("/b"), api.get("/c"), api.get("/d"), api.get("/e"), api.get("/f")]);
  assert.equal(refreshes, 1, `six concurrent 401s must trigger one refresh, got ${refreshes}`);
});

// 4 — the nested list envelope the API actually returns
await test("list() normalises data.data / data.meta", async () => {
  globalThis.fetch = async () =>
    ok({ data: [{ id: "a" }], meta: { page: 1, limit: 1, total: 9, totalPages: 9 } });

  const api = createApiClient({ baseUrl: "https://api.test/api/v1", getAccessToken: () => "t" });
  const { items, meta } = await api.list("/admin/products");
  assert.deepEqual(items, [{ id: "a" }]);
  assert.equal(meta.total, 9);

  assert.deepEqual(unwrapList([{ id: "x" }]).items, [{ id: "x" }], "a bare array still works");
});

// 5 — §9.1 validation errors become field errors
await test("VALIDATION_ERROR -> fieldErrors", async () => {
  globalThis.fetch = async () =>
    fail("VALIDATION_ERROR", 422, [{ field: "email", message: "Invalid email address" }]);

  const api = createApiClient({ baseUrl: "https://api.test/api/v1", getAccessToken: () => "t" });
  await assert.rejects(
    () => api.post("/admin/users", { email: "nope" }),
    (e) => e instanceof ApiError && e.fieldErrors.email === "Invalid email address" && e.status === 422,
  );
});

// 6 — 429 keeps Retry-After so the UI can count down instead of hammering
await test("RATE_LIMITED keeps Retry-After", async () => {
  globalThis.fetch = async () =>
    json({ success: false, error: { code: "RATE_LIMITED", message: "slow down" } }, 429, {
      "Retry-After": "42",
    });

  const api = createApiClient({ baseUrl: "https://api.test/api/v1", getAccessToken: () => "t" });
  await assert.rejects(() => api.get("/x"), (e) => e.retryAfter === 42);
});

