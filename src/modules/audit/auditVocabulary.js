/**
 * What the audit trail can contain.
 *
 * `action` and `resource` are **exact-match** filters on the API, so a typo
 * returns an empty page rather than an error — which reads as "nothing
 * happened" and is the worst possible failure for an evidence trail. The
 * vocabulary is therefore a fixed list rather than a free-text box.
 *
 * Both lists are transcribed from `routes/admin.php`, where every mutating
 * route carries an `AuditLog` instance naming its entity type. A test reads
 * that file and fails if the two drift.
 */

/** Entity types, grouped so a 26-item select is navigable. */
export const RESOURCE_GROUPS = [
  {
    label: "Catalogue",
    resources: [
      "Product",
      "Category",
      "ProductImage",
      "ProductPackSize",
      "ProductHighlight",
    ],
  },
  {
    label: "Content",
    resources: [
      "Banner",
      "PageBlock",
      "News",
      "GalleryCategory",
      "GalleryImage",
      "Media",
      "Download",
    ],
  },
  {
    label: "Marketing",
    resources: ["FeatureItem", "ProcessStep", "StatCounter", "Certification", "Testimonial"],
  },
  {
    label: "Leads",
    resources: ["Enquiry", "DealerApplication", "ContactMessage", "Subscriber", "Review"],
  },
  {
    label: "System",
    resources: ["SiteProfile", "Settings", "MenuLink", "SocialLink"],
  },
];

export const RESOURCES = RESOURCE_GROUPS.flatMap((group) => group.resources);

/**
 * `ProductPackSize` -> `Product pack size`.
 *
 * Sentence case, not Title Case: these labels are dropped into sentences
 * ("Nisad updated a product pack size"), where Title Case would read as a
 * proper noun.
 */
export const resourceLabel = (resource) =>
  String(resource ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase()) || "Unknown";

/**
 * Actions, as the middleware composes them: `strtolower(entityType) + '.' +
 * (action ?? defaultAction(method))`, where the default is create / update /
 * delete by HTTP verb.
 */
export const ACTIONS = [
  { value: "create", label: "Created", tone: "success" },
  { value: "update", label: "Updated", tone: "info" },
  { value: "delete", label: "Deleted", tone: "danger" },
  { value: "reorder", label: "Reordered", tone: "neutral" },
  { value: "approve", label: "Approved", tone: "success" },
  { value: "reject", label: "Rejected", tone: "danger" },
  { value: "bulk_approve", label: "Approved in bulk", tone: "success" },
  { value: "bulk_reject", label: "Rejected in bulk", tone: "danger" },
  { value: "bulk_create", label: "Created in bulk", tone: "success" },
];

export const ACTION_VALUES = ACTIONS.map((a) => a.value);

const ACTION_BY_VALUE = new Map(ACTIONS.map((a) => [a.value, a]));

/** The verb half of `banner.update`. */
export const verbOf = (action) => String(action ?? "").split(".").slice(1).join(".") || null;

/** The resource half, lowercased — `banner` from `banner.update`. */
export const subjectOf = (action) => String(action ?? "").split(".")[0] || null;

export const actionLabel = (action) => {
  const verb = verbOf(action);
  return ACTION_BY_VALUE.get(verb)?.label ?? (verb ? resourceLabel(verb) : String(action ?? ""));
};

export const actionTone = (action) => ACTION_BY_VALUE.get(verbOf(action))?.tone ?? "neutral";

/**
 * The full action string for a filter, e.g. `Banner` + `update` -> `banner.update`.
 *
 * The API matches `action` exactly and separately from `resource`, so filtering
 * by verb alone is impossible — a verb needs a resource to be a real action
 * string. Returns null when there is nothing to send.
 */
export function toActionFilter(resource, verb) {
  if (!resource || !verb) return null;
  return `${String(resource).toLowerCase()}.${verb}`;
}

/**
 * A one-line summary of a row, so the list reads as sentences rather than ids.
 * `entity_id` is null for a bulk action or a reorder, which have no single row.
 */
export function describeEntry(entry) {
  const who = entry?.admin_name ?? "A removed admin";
  const what = actionLabel(entry?.action).toLowerCase();
  const subject = resourceLabel(entry?.entity_type).toLowerCase();
  return `${who} ${what} a ${subject}`;
}
