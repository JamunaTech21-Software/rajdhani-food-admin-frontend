import { toDate } from "./format.js";

/**
 * What a post is actually doing, which `status` alone does not say.
 *
 * `published_at` in the future means PUBLISHED-but-not-yet-visible (§8.7: the
 * post is invisible publicly until that moment passes). A list showing a green
 * "Published" badge against a post no reader can reach has told the editor the
 * opposite of the truth — RTPP-46's first acceptance criterion is precisely
 * that this reads "Scheduled".
 *
 * Null `published_at` on a PUBLISHED post means the server stamped it at
 * publish time, so it is live now.
 */
export function newsState(post, now = Date.now()) {
  if (post?.status === "DRAFT") return "draft";
  if (post?.status === "ARCHIVED") return "archived";

  const at = toDate(post?.published_at)?.getTime();
  if (at !== undefined && at > now) return "scheduled";
  return "published";
}

export const NEWS_LABEL = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
  archived: "Archived",
};

export const NEWS_TONE = {
  published: "success",
  scheduled: "info",
  draft: "warning",
  archived: "neutral",
};

/** Only a live post has something to look at on the public site. */
export const isPubliclyVisible = (post, now = Date.now()) => newsState(post, now) === "published";
