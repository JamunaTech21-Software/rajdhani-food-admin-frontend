/**
 * The customer site's route shapes — pure, so it can be tested directly.
 *
 * Separate from `publicUrl.js` because that one reads `SITE_URL` from
 * `config.js`, which reads `import.meta.env` — a Vite construct that does not
 * exist under plain node. Importing it would make this untestable, and these
 * paths are the part actually worth testing: `references.js` scans page content
 * for the download path, so two modules disagreeing about it would break the
 * delete warning silently.
 *
 * Note the paths cannot use optional chaining on `import.meta.env` as a
 * workaround: Vite's `define` matches the exact source text
 * `import.meta.env.VITE_BASE_URL`, and `?.` would stop it being replaced.
 */

export const PUBLIC_PATHS = {
  product: (slug) => `/products/${slug}`,
  news: (slug) => `/news/${slug}`,
  // Resolved by key, not id — see modules/downloads/downloadKey.js.
  download: (key) => `/downloads/${key}`,
  page: (path) => path,
};

/**
 * The path for one resource, or null when there is nothing to link to.
 *
 * Null rather than a broken path: a product with no slug, or a draft never
 * published, has no page. `/products/undefined` renders as a working link and
 * tells an editor the content is live when it is not.
 */
export function publicPath(kind, identifier) {
  const build = PUBLIC_PATHS[kind];
  if (!build || identifier === null || identifier === undefined || identifier === "") return null;

  return build(identifier);
}

/**
 * The common case of "is this live": the §8.1 `content_status` enum, or the
 * `is_active` boolean the simpler resources use instead.
 *
 * Deliberately *not* named `isPubliclyVisible` — `lib/newsSchedule.js` already
 * owns that name for a stricter, schedule-aware check, and two functions with
 * one name answering slightly different questions is how the wrong one gets
 * imported. Resources with their own rule pass their own verdict instead.
 */
export function isPublished(row) {
  if (!row) return false;
  // Status wins where a row carries both: a DRAFT row that is also is_active
  // is still not on the site.
  if (typeof row.status === "string") return row.status === "PUBLISHED";
  if (typeof row.is_active === "boolean") return row.is_active;
  return true;
}
