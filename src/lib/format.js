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
function toDate(value) {
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
