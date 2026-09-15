/**
 * Where a download key is linked from.
 *
 * RTPP-51 asks for a warning when the key being deleted is referenced on a page.
 * The API has no endpoint for that — nothing stores the relationship, because a
 * reference is just a URL an editor typed into a button. So it is found the only
 * way it can be: by reading the places those URLs live and looking for the path.
 *
 * Best-effort by construction. A missed reference leaves the editor no worse off
 * than the plain confirmation they would otherwise get; a false positive would
 * be worse, so the match is deliberately strict about key boundaries.
 */

import { isValidKey, publicDownloadPath } from "./downloadKey.js";

/**
 * Matches the download path for exactly this key.
 *
 * The trailing boundary matters: without it, deleting `catalogue` would report
 * every `/downloads/catalogue_2026` link as a reference to it.
 *
 * No escaping is needed — callers are gated on `isValidKey`, so the key is
 * `[a-z0-9_]+` and carries nothing the regex engine would read as syntax.
 */
const pattern = (key) => new RegExp(`${publicDownloadPath(key)}(?![a-z0-9_])`, "i");

/** The fields on each record that can hold a link an editor typed. */
const LINK_FIELDS = {
  banner: ["primary_cta_url", "secondary_cta_url"],
  block: ["cta_url", "body"],
};

const bannerLabel = (banner) =>
  banner.title || banner.eyebrow_text || banner.placement || "Untitled banner";

const blockLabel = (block) =>
  block.heading ? `${block.page_key} — ${block.heading}` : `${block.page_key} — ${block.block_key}`;

/**
 * Every place `key` is linked from, as `{ kind, label }` rows.
 *
 * `sources` is `{ banners, blocks }`; either may be missing, which is what
 * happens when the admin lacks the capability to read them. That is reported
 * separately by `scanWasComplete` rather than silently looking like "no
 * references found".
 */
export function findReferences(key, sources = {}) {
  if (!isValidKey(key)) return [];
  const matches = pattern(key);

  const scan = (records, kind, label) =>
    (records ?? [])
      .filter((record) => LINK_FIELDS[kind].some((field) => matches.test(record[field] ?? "")))
      .map((record) => ({ kind, label: label(record) }));

  return [
    ...scan(sources.banners, "banner", bannerLabel),
    ...scan(sources.blocks, "block", blockLabel),
  ];
}

/**
 * Whether the scan actually saw everything it claims to cover. A Sales admin can
 * read downloads but not banners or page content, so the confirmation must say
 * "could not check" rather than "nothing links here".
 */
export const scanWasComplete = (sources = {}) =>
  Array.isArray(sources.banners) && Array.isArray(sources.blocks);

/** The delete confirmation's body text, given what the scan found. */
export function deleteWarning(download, sources) {
  const references = findReferences(download?.key, sources);

  if (references.length > 0) {
    const list = references.map((r) => `“${r.label}”`).join(", ");
    return `${list} still links to /downloads/${download.key}. Deleting this breaks ${
      references.length === 1 ? "that link" : "those links"
    } — they will 404 for visitors.`;
  }

  if (!scanWasComplete(sources)) {
    return `Nothing else can be checked from here — you do not have access to banners and page content, so a link to /downloads/${download.key} may still exist.`;
  }

  return `Nothing links to /downloads/${download.key}, so no page will break. The download count is lost with it.`;
}
