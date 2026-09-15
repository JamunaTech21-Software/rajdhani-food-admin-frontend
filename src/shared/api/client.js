import { ApiError, ErrorCode } from "./errors.js";

function buildUrl(baseUrl, path, params) {
  const url = new URL(
    String(path).replace(/^\//, ""),
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined; // signals "not the §9.1 envelope"
  }
}

function toApiError(response, body) {
  if (body === undefined || body === null) {
    return new ApiError({
      code: response.status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.NETWORK_ERROR,
      status: response.status,
    });
  }
  const error = body.error ?? {};
  const retryAfter = Number(response.headers.get("Retry-After")) || null;
  return new ApiError({
    code: error.code,
    message: error.message,
    details: error.details,
    status: response.status,
    retryAfter,
  });
}

/**
 * The §9.1 envelope is `{ success, data, meta }`, but every list endpoint
 * actually nests pagination one level deeper as `data: { data, meta }`.
 * That is consistent across the whole admin surface, so it is normalised here
 * once rather than in every screen. Raised with the backend 2026-09-15.
 */
export function unwrapList(data) {
  if (data && !Array.isArray(data) && Array.isArray(data.data)) {
    return { items: data.data, meta: data.meta ?? null };
  }
  return { items: Array.isArray(data) ? data : [], meta: data?.meta ?? null };
}

export function createApiClient({ baseUrl, getAccessToken, refreshSession, onAuthFailure }) {
  let inFlightRefresh = null;

  // Single-flight: a page firing six queries at once must not send six refreshes,
  // which would rotate the token family and trip the API's reuse detection (§7.1).
  function refreshOnce() {
    if (!refreshSession) return Promise.resolve(null);
    inFlightRefresh ??= Promise.resolve()
      .then(refreshSession)
      .finally(() => {
        inFlightRefresh = null;
      });
    return inFlightRefresh;
  }

  async function request(path, options = {}) {
    const { method = "GET", body, params, signal, auth = true, headers = {}, _retried = false } = options;

    const requestHeaders = { Accept: "application/json", ...headers };
    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const token = auth ? getAccessToken?.() : null;
    if (token) requestHeaders.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(buildUrl(baseUrl, path, params), {
        method,
        headers: requestHeaders,
        credentials: "include", // refresh cookie is HttpOnly and cross-origin
        signal,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch (cause) {
      if (cause?.name === "AbortError") throw cause;
      throw new ApiError({ code: ErrorCode.NETWORK_ERROR });
    }

    if (response.status === 401 && auth && !_retried) {
      const renewed = await refreshOnce();
      if (renewed) return request(path, { ...options, _retried: true });
      onAuthFailure?.();
    }

    const payload = await readBody(response);
    if (!response.ok || payload?.success === false) throw toApiError(response, payload);

    return payload === null ? null : payload?.data;
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) => request(path, { ...options, method: "POST", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" }),
    list: async (path, options) => unwrapList(await request(path, { ...options, method: "GET" })),
  };
}
