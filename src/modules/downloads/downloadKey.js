/**
 * A download's `key` is its public contract.
 *
 * `GET /public/downloads/{key}` resolves by key rather than by id, and the
 * customer site's buttons are built against known keys like `dealer_brochure`.
 * So the key — not the file, and not the row id — is what must stay stable:
 * replacing the PDF behind a key keeps every existing link working, and renaming
 * the key breaks all of them at once.
 */

export const KEY_PATTERN = /^[a-z0-9_]+$/;

export const isValidKey = (key) => KEY_PATTERN.test(key ?? "");

/** Suggest a key from a title. Only ever a suggestion — the editor may override. */
export function toKey(title = "") {
  return title
    .toLowerCase()
    .normalize("NFKD")
    // Strip accents so "Brochure Français" does not become "brochure_fran_ais".
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** The path the customer site links to. */
export const publicDownloadPath = (key) => `/downloads/${key}`;

/**
 * What changing a key actually costs, phrased for the person about to do it.
 * Returns null when the key is unchanged — the common case of replacing a file.
 */
export function keyChangeWarning(previousKey, nextKey) {
  if (!previousKey || previousKey === nextKey) return null;
  return `Any link built against “${previousKey}” will stop working. Replacing the file instead keeps every existing link intact.`;
}
