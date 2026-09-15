/**
 * The §8.1 `banner_placement` enum, with the context an editor needs.
 *
 * `slider: true` marks the one placement §10.1 says renders multiple banners in
 * rotation — everywhere else, order decides which single banner wins, which is
 * worth saying out loud on the screen.
 */
export const PLACEMENTS = [
  {
    value: "HOME_HERO",
    label: "Home hero",
    group: "Page heroes",
    slider: true,
    hint: "The main slider at the top of the home page.",
  },
  { value: "ABOUT_HERO", label: "About hero", group: "Page heroes" },
  { value: "PRODUCTS_HERO", label: "Products hero", group: "Page heroes" },
  { value: "PRODUCT_DETAIL_HERO", label: "Product detail hero", group: "Page heroes" },
  { value: "QUALITY_HERO", label: "Quality hero", group: "Page heroes" },
  { value: "DEALER_HERO", label: "Dealer hero", group: "Page heroes" },
  { value: "GALLERY_HERO", label: "Gallery hero", group: "Page heroes" },
  { value: "NEWS_HERO", label: "News hero", group: "Page heroes" },
  { value: "CONTACT_HERO", label: "Contact hero", group: "Page heroes" },

  {
    value: "HOME_PROMO",
    label: "Home promo card",
    group: "Promotions",
    hint: "The promotional card in the welcome block.",
  },
  {
    value: "HOME_VIDEO_CARD",
    label: "Home video card",
    group: "Promotions",
    hint: "Opens a video modal — set the video URL.",
  },
  { value: "MID_PAGE_CTA", label: "Mid-page CTA", group: "Promotions" },
  { value: "DEALER_CTA", label: "Dealer CTA", group: "Promotions" },
  { value: "SIDEBAR_AD", label: "Sidebar ad", group: "Promotions" },
];

export const PLACEMENT_GROUPS = ["Page heroes", "Promotions"];

const BY_VALUE = new Map(PLACEMENTS.map((p) => [p.value, p]));

export const placementOf = (value) =>
  BY_VALUE.get(value) ?? { value, label: value, group: "Page heroes" };

/** Group banners by placement, keeping every placement visible even when empty. */
export function groupByPlacement(banners = []) {
  const buckets = new Map(PLACEMENTS.map((p) => [p.value, []]));

  for (const banner of banners) {
    // A placement the front end does not know about must still be reachable,
    // or an enum added server-side would strand its banners invisibly.
    if (!buckets.has(banner.placement)) buckets.set(banner.placement, []);
    buckets.get(banner.placement).push(banner);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  return buckets;
}
