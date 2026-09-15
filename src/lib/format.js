// The client is in Bangladesh and the API sends UTC (§8.0), so everything an
// admin reads is rendered in Asia/Dhaka rather than the browser's zone — two
// admins in different places must not see different timestamps for one lead.
const ZONE = "Asia/Dhaka";
const LOCALE = "en-GB";

const numberFormat = new Intl.NumberFormat(LOCALE);
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const chartDayFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
});

/** The API sends "2026-09-15 06:03:09.869" as well as ISO — normalise both. */
export function toDate(value) {
  if (!value) return null;
  const normalised = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(normalised) ? normalised : `${normalised}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const formatNumber = (value) => numberFormat.format(value ?? 0);

export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormat.format(date) : "—";
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTimeFormat.format(date) : "—";
}

export function formatChartDay(value) {
  const date = toDate(value);
  return date ? chartDayFormat.format(date) : "";
}

/** How far `timeZone` is from UTC at a given instant, in milliseconds. */
function zoneOffsetMs(date, timeZone = ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return asIfUtc - date.getTime();
}

/**
 * UTC timestamp to the `YYYY-MM-DDTHH:mm` a datetime-local input wants,
 * expressed in Asia/Dhaka.
 *
 * Not the browser's own zone: every other date on screen is rendered in Dhaka,
 * and an editor abroad typing "09:00" into a scheduling field means the site's
 * 09:00, not theirs.
 */
export function toDateTimeLocalInput(value) {
  const date = toDate(value);
  if (!date) return "";
  return new Date(date.getTime() + zoneOffsetMs(date)).toISOString().slice(0, 16);
}

// datetime-local produces exactly this. The shape is checked before parsing
// because V8's Date.parse is lenient enough to turn "not a date" into a real
// timestamp (1999-12-31) rather than NaN — which would then be saved.
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** The inverse: a Dhaka wall-clock string back to a UTC ISO timestamp. */
export function fromDateTimeLocalInput(value) {
  if (!value || !DATETIME_LOCAL.test(value)) return null;

  const naive = Date.parse(value.length === 16 ? `${value}:00Z` : `${value}Z`);
  if (Number.isNaN(naive)) return null;

  // One correction pass is enough: the offset is looked up at very nearly the
  // right instant, and Bangladesh has no DST for it to straddle.
  const utc = naive - zoneOffsetMs(new Date(naive));
  return new Date(utc).toISOString();
}

const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 hours ago". Pass `now` so callers can keep render pure. */
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "—";

  const seconds = Math.round((date.getTime() - now) / 1000);
  const magnitude = Math.abs(seconds);
  if (magnitude < 45) return "just now";

  for (const [unit, size] of UNITS) {
    if (magnitude >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return relativeFormat.format(Math.round(seconds / 60), "minute");
}
