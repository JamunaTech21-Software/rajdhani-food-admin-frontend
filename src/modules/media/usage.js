// Relative rather than the `@shared` alias: this module is pure logic and is
// tested under plain node, which does not resolve Vite's aliases.
import { ApiError, ErrorCode } from "../../shared/api/errors.js";

/**
 * Turn `GET /admin/media/{id}`'s usage rows into the sentence an editor needs.
 *
 * The API returns `usage: [{ table, count, label }]` proactively, so the
 * dashboard can warn *before* a delete is attempted rather than only explaining
 * the 409 afterwards.
 */
export function describeUsage(usage = []) {
  if (!usage.length) return null;
  return usage.map((u) => `${u.count} ${u.label}`).join(", ");
}

/**
 * The tables named by a `409 CONFLICT` from `DELETE /admin/media/{id}`.
 *
 * `error.details` uses the referencing table name as each entry's `field`, which
 * is what lets the screen say "in use by: categories, banners" rather than
 * refusing without explanation.
 */
export function conflictTables(error) {
  if (!(error instanceof ApiError) || error.code !== ErrorCode.CONFLICT) return [];
  return error.details.map((detail) => detail.field).filter(Boolean);
}

/** True when anything at all references the asset. */
export const isInUse = (asset) => Boolean(asset?.usage?.length);
