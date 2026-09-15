/**
 * Where a menu link appears, and how social platforms are labelled.
 *
 * The four locations are an enum in `MenuLinkInput`; the platform on a social
 * link is deliberately *not* — the column is VARCHAR(64), so the list below is
 * a set of suggestions, never a restriction.
 */

export const MENU_LOCATIONS = [
  {
    value: "header",
    label: "Header",
    description: "The main navigation. Links here may have children, which render as a dropdown.",
    nesting: true,
  },
  {
    value: "footer_quick",
    label: "Footer — Quick links",
    description: "The first footer column.",
    nesting: false,
  },
  {
    value: "footer_products",
    label: "Footer — Products",
    description: "The second footer column.",
    nesting: false,
  },
  {
    value: "legal",
    label: "Legal",
    description: "Privacy, terms and the like, along the bottom of the footer.",
    nesting: false,
  },
];

export const MENU_LOCATION_VALUES = MENU_LOCATIONS.map((l) => l.value);

export const locationOf = (value) =>
  MENU_LOCATIONS.find((l) => l.value === value) ?? { value, label: value, nesting: false };

/** Links for one location, parents first with their children beneath them. */
export function groupByLocation(links) {
  const grouped = new Map(MENU_LOCATION_VALUES.map((value) => [value, []]));

  for (const link of links ?? []) {
    if (!grouped.has(link.location)) grouped.set(link.location, []);
    grouped.get(link.location).push(link);
  }

  for (const [, list] of grouped) list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return grouped;
}

/**
 * Top-level links, each with its children attached.
 *
 * Only the header nests, but the data model allows `parent_id` anywhere, so a
 * child that ended up in a flat location is surfaced at the top rather than
 * hidden — an invisible row is worse than a slightly wrong one.
 */
export function asTree(links) {
  const list = links ?? [];
  const ids = new Set(list.map((link) => link.id));
  const children = new Map();

  for (const link of list) {
    if (link.parent_id && ids.has(link.parent_id)) {
      if (!children.has(link.parent_id)) children.set(link.parent_id, []);
      children.get(link.parent_id).push(link);
    }
  }

  const roots = list.filter((link) => !link.parent_id || !ids.has(link.parent_id));

  return roots.map((link) => ({
    ...link,
    children: (children.get(link.id) ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

/** Candidate parents for one link: same location, top level, never itself. */
export function parentOptions(links, link) {
  return (links ?? []).filter(
    (candidate) =>
      candidate.location === link?.location &&
      !candidate.parent_id &&
      candidate.id !== link?.id,
  );
}

/** Common platforms, offered as suggestions. `platform` is free text. */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
  "x",
  "tiktok",
  "whatsapp",
  "pinterest",
];
