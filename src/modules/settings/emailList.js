/**
 * Notification recipient lists.
 *
 * `settings` stores these as one comma-separated string per event type
 * (`enquiry_notify_emails` and friends). Empty is meaningful, not missing: the
 * seeder's note is that an empty list falls back to `site_profile.email_primary`,
 * so clearing the box is a real configuration, and the UI has to say so rather
 * than look like an unfinished form.
 */

// Deliberately not the full RFC 5322 grammar — that rejects addresses that work
// and accepts ones that do not. This catches the mistakes people actually make:
// a missing @, a missing dot, a stray space, a trailing comma.
const ADDRESS = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export const isEmail = (value) => ADDRESS.test(value ?? "");

/** The stored string as a list, tolerating the separators people actually type. */
export function parseEmails(value) {
  return String(value ?? "")
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Back to storage form. Duplicates are dropped case-insensitively: the same
 * person twice in a list means two copies of every notification.
 */
export function formatEmails(list) {
  const seen = new Set();
  const out = [];

  for (const entry of list) {
    const address = entry.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(address);
  }

  return out.join(", ");
}

/** Normalise whatever was typed into what should be stored. */
export const normaliseEmails = (value) => formatEmails(parseEmails(value));

/**
 * The addresses that are not usable, so the message can name them. Returns an
 * empty array for an empty list — that is valid, not an error.
 */
export const invalidEmails = (value) => parseEmails(value).filter((entry) => !isEmail(entry));

/** A validation message, or null when the list is fine. */
export function emailListError(value) {
  const bad = invalidEmails(value);
  if (bad.length === 0) return null;
  return bad.length === 1
    ? `“${bad[0]}” is not a valid email address`
    : `${bad.length} addresses are not valid: ${bad.join(", ")}`;
}
