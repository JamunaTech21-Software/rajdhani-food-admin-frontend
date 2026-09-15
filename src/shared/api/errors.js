export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
};

const FALLBACK_MESSAGE = {
  [ErrorCode.VALIDATION_ERROR]: "Please check the highlighted fields and try again.",
  [ErrorCode.UNAUTHENTICATED]: "Your session has ended. Please sign in again.",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please sign in again.",
  [ErrorCode.FORBIDDEN]: "You do not have permission to do that.",
  [ErrorCode.NOT_FOUND]: "That item no longer exists.",
  [ErrorCode.CONFLICT]: "That change conflicts with the current state.",
  [ErrorCode.RATE_LIMITED]: "Too many attempts. Please wait a moment and try again.",
  [ErrorCode.UPLOAD_FAILED]: "The upload did not complete. Please try again.",
  [ErrorCode.INTERNAL_ERROR]: "Something went wrong at our end. Please try again.",
  [ErrorCode.NETWORK_ERROR]: "Could not reach the server. Check your connection.",
};

export class ApiError extends Error {
  constructor({ code, message, details, status, retryAfter }) {
    super(message || FALLBACK_MESSAGE[code] || "Request failed.");
    this.name = "ApiError";
    this.code = code || ErrorCode.INTERNAL_ERROR;
    this.details = Array.isArray(details) ? details : [];
    this.status = status ?? 0;
    this.retryAfter = retryAfter ?? null;
  }

  /** §9.1 `details` as { field: message }, ready for a form library's setError. */
  get fieldErrors() {
    const out = {};
    for (const d of this.details) {
      if (d?.field && !(d.field in out)) out[d.field] = d.message;
    }
    return out;
  }

  get isAuth() {
    return this.code === ErrorCode.UNAUTHENTICATED || this.code === ErrorCode.TOKEN_EXPIRED;
  }
}

export const friendlyMessage = (error) =>
  error instanceof ApiError ? error.message : FALLBACK_MESSAGE[ErrorCode.INTERNAL_ERROR];
