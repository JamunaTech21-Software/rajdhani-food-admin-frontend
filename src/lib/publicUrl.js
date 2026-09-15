/**
 * Where a piece of content lives on the customer site.
 *
 * §11 wants a "View on site" link on every published row, which means the admin
 * has to know the public site's URL shapes. Those were being written inline as
 * template literals in five different screens — so a route change on the
 * customer side would have to be found five times, and the one that was missed
 * would send an editor to a 404.
 *
 * The path shapes live in `publicPaths.js`, which stays free of `config.js` so
 * it can be unit-tested. This module is the thin part that adds the origin.
 */

import { SITE_URL } from "../config.js";
import { publicPath } from "./publicPaths.js";

export { isPublished, PUBLIC_PATHS, publicPath } from "./publicPaths.js";

/** An absolute URL, or null when there is nothing to link to. */
export function publicUrl(kind, identifier) {
  const path = publicPath(kind, identifier);
  return path === null ? null : `${SITE_URL}${path}`;
}
