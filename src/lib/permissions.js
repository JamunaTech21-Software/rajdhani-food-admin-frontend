// The §7.3 access levels, in ascending order. `own` sits between read and write
// for one cell only: an Editor may delete media they uploaded, not anyone else's.
export const LEVELS = { none: 0, read: 1, own: 2, write: 3 };

/**
 * Check a capability against this admin's row of the §7.3 matrix, as returned
 * by GET /auth/admin/me.
 *
 * Deny by default: an unknown capability, a missing permissions object or an
 * unrecognised level all evaluate to `none`.
 */
export function hasCapability(permissions, capability, minimum = "read") {
  return (LEVELS[permissions?.[capability]] ?? 0) >= (LEVELS[minimum] ?? 0);
}
