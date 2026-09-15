import { toDate } from "./format.js";

/**
 * What a banner is actually doing right now.
 *
 * Status alone is not the answer: a PUBLISHED banner with a future `starts_at`
 * is not on the site, and one whose `ends_at` has passed has quietly come off
 * it. §11 asks the grid to say which — an editor looking at a "Published" badge
 * on a banner nobody can see has been told the wrong thing.
 *
 * Null bounds mean unbounded (§8.7): no `starts_at` is "as soon as published",
 * no `ends_at` is "until further notice".
 */
export function scheduleState(banner, now = Date.now()) {
  if (banner?.status === "DRAFT") return "draft";
  if (banner?.status === "ARCHIVED") return "archived";

  const starts = toDate(banner?.starts_at)?.getTime();
  const ends = toDate(banner?.ends_at)?.getTime();

  if (ends !== undefined && ends <= now) return "expired";
  if (starts !== undefined && starts > now) return "scheduled";
  return "live";
}

export const SCHEDULE_LABEL = {
  live: "Live",
  scheduled: "Scheduled",
  expired: "Expired",
  draft: "Draft",
  archived: "Archived",
};

export const SCHEDULE_TONE = {
  live: "success",
  scheduled: "info",
  expired: "neutral",
  draft: "warning",
  archived: "neutral",
};

/** True when the window itself is impossible, whatever the status says. */
export function hasInvalidWindow(startsAt, endsAt) {
  const starts = toDate(startsAt)?.getTime();
  const ends = toDate(endsAt)?.getTime();
  if (starts === undefined || ends === undefined) return false;
  return ends <= starts;
}
