/**
 * Turning an audit row's `before`/`after` into something a person can read.
 *
 * The API stores three distinct shapes and they are easy to conflate:
 *
 *   update  both sides present, each holding **only the keys that changed** —
 *           `AuditDiff::compact()` reduces them before writing, so the two
 *           always share a key set.
 *   create  `before: null`, `after` is the whole new row.
 *   delete  `before` is the whole row, `after: null`.
 *
 * RTPP-54 asks for "a readable form, not raw JSON blobs", so values are
 * rendered as what they mean — Yes/No, "(empty)", a count of items — rather
 * than `true`, `null`, `[object Object]`.
 */

import { formatDateTime } from "../../lib/format.js";

export const CHANGE_KIND = { CREATE: "create", UPDATE: "update", DELETE: "delete" };

/** Which of the three shapes this row is, read off the data rather than the action. */
export function changeKind(entry) {
  const hasBefore = entry?.before != null;
  const hasAfter = entry?.after != null;

  if (!hasBefore && hasAfter) return CHANGE_KIND.CREATE;
  if (hasBefore && !hasAfter) return CHANGE_KIND.DELETE;
  return CHANGE_KIND.UPDATE;
}

// Fields whose humanised name reads badly or misleadingly.
const FIELD_LABELS = {
  id: "ID",
  url: "URL",
  seo_title: "SEO title",
  seo_description: "SEO description",
  og_image_id: "Share image",
  is_active: "Active",
  is_featured: "Featured",
  sort_order: "Order",
  parent_id: "Parent",
  meta_title: "Meta title",
  meta_description: "Meta description",
  primary_color: "Primary colour",
  secondary_color: "Secondary colour",
  accent_color: "Accent colour",
  open_in_new_tab: "Opens in a new tab",
  requires_email: "Requires an email",
  download_count: "Download count",
  view_count: "View count",
};

/** `meta_title` -> `Meta title`; `seo_title` -> `SEO title`. */
export function fieldLabel(field) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return String(field ?? "")
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// Noise: every row carries these and they never answer "what changed".
const HIDDEN_FIELDS = new Set(["updated_at", "created_at", "id"]);

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/**
 * One value, as a person would say it.
 *
 * Returns `{ text, empty }` rather than a bare string: an absent value has to
 * render differently from the literal text "(empty)" that someone could have
 * typed, and the caller styles it accordingly.
 */
export function formatValue(value) {
  if (value === null || value === undefined) return { text: "Not set", empty: true };
  if (value === "") return { text: "Empty", empty: true };
  if (typeof value === "boolean") return { text: value ? "Yes" : "No", empty: false };

  if (Array.isArray(value)) {
    if (value.length === 0) return { text: "Nothing", empty: true };
    // A list of ids is unreadable; a count is honest and short.
    const scalars = value.every((item) => item === null || typeof item !== "object");
    return {
      text: scalars ? value.join(", ") : `${value.length} item${value.length === 1 ? "" : "s"}`,
      empty: false,
    };
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    return { text: keys.length ? `{ ${keys.join(", ")} }` : "Nothing", empty: keys.length === 0 };
  }

  if (typeof value === "string" && ISO_TIMESTAMP.test(value)) {
    return { text: formatDateTime(value), empty: false };
  }

  return { text: String(value), empty: false };
}

/**
 * The changed fields as rows, ready to render.
 *
 * Sorted with the longest values last so a one-line status flip is not pushed
 * off-screen by a rich-text body that changed in the same save.
 */
export function diffRows(entry) {
  const kind = changeKind(entry);
  const before = entry?.before ?? {};
  const after = entry?.after ?? {};

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => !HIDDEN_FIELDS.has(key),
  );

  const rows = keys.map((field) => {
    const from = kind === CHANGE_KIND.CREATE ? undefined : before[field];
    const to = kind === CHANGE_KIND.DELETE ? undefined : after[field];

    return {
      field,
      label: fieldLabel(field),
      from: formatValue(from),
      to: formatValue(to),
      // Long values need their own full-width block rather than a side-by-side
      // pair that would wrap into an unreadable column.
      long: [from, to].some((v) => typeof v === "string" && v.length > 80),
    };
  });

  return rows.sort((a, b) => Number(a.long) - Number(b.long));
}

/**
 * Whether there is anything to expand.
 *
 * A reorder or a bulk action records no field-level diff — there is no single
 * row it belongs to — so the UI must say that rather than open an empty panel.
 */
export const hasDiff = (entry) => diffRows(entry).length > 0;
