/**
 * The blocks each static page is designed to have.
 *
 * This exists because the database only holds blocks somebody has already
 * created — five, at the time of writing. Listing only those would leave every
 * other block in the approved designs invisible and therefore uneditable, which
 * is exactly what RTPP-43's acceptance criterion forbids. So the screen lists
 * the *designed* set and marks which ones are not set up yet.
 *
 * `where` is the labelling §11 asks for: a non-technical editor should be able
 * to tell which part of which page they are changing without opening the site.
 */
export const PAGES = [
  {
    key: "home",
    label: "Home",
    path: "/",
    blocks: [
      {
        key: "welcome",
        label: "Welcome block",
        where: "The About teaser under the USP strip, with its benefit list.",
        uses: ["eyebrow", "heading", "body", "bullet_points", "cta"],
      },
    ],
  },
  {
    key: "about",
    label: "About Us",
    path: "/about",
    blocks: [
      {
        key: "our_story",
        label: "Our company",
        where: "The opening block beside the building photograph.",
        uses: ["eyebrow", "heading", "body", "image", "cta"],
      },
      {
        key: "mission",
        label: "Mission",
        where: "First of the three Mission / Vision / Values cards.",
        uses: ["heading", "body"],
      },
      {
        key: "vision",
        label: "Vision",
        where: "Second of the three cards.",
        uses: ["heading", "body"],
      },
      {
        key: "values",
        label: "Values",
        where: "Third card — the ticked list of company values.",
        uses: ["heading", "bullet_points"],
      },
      {
        key: "foundations",
        label: "Foundations heading",
        where: "The eyebrow and title above the three cards.",
        uses: ["eyebrow", "heading"],
      },
      {
        key: "strength",
        label: "Our strength",
        where: "The prose and button beside the five manufacturing steps.",
        uses: ["eyebrow", "heading", "body", "cta"],
      },
      {
        key: "certifications",
        label: "Certifications heading",
        where: "The eyebrow and title beside the certification marks.",
        uses: ["eyebrow", "heading"],
      },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    path: "/quality",
    blocks: [
      {
        key: "commitment",
        label: "Our commitment to quality",
        where: "The prose beside the commitment grid.",
        uses: ["heading", "body"],
      },
      {
        key: "assurance",
        label: "Quality assurance promise",
        where: "The closing dark panel with its checklist.",
        uses: ["heading", "body", "bullet_points"],
      },
      {
        key: "process",
        label: "Process heading",
        where: "The eyebrow and title above the five-step process.",
        uses: ["eyebrow", "heading"],
      },
      {
        key: "certifications",
        label: "Certifications heading",
        where: "The eyebrow and title above the certification marks.",
        uses: ["eyebrow", "heading"],
      },
    ],
  },
  {
    key: "dealer",
    label: "Dealer / Distributor",
    path: "/dealer-distributor",
    blocks: [
      {
        key: "intro",
        label: "Why partner with us",
        where: "The prose beside the benefit cards.",
        uses: ["heading", "body", "cta"],
      },
      {
        key: "network",
        label: "Distribution network",
        where: "Heading and subtext above the map and its counters.",
        uses: ["heading", "subheading"],
      },
      {
        key: "requirements",
        label: "Dealer requirements",
        where: "The ticked checklist in the dark green panel.",
        uses: ["heading", "bullet_points"],
      },
      {
        key: "build_future",
        label: "Let’s build a strong future",
        where: "The small card beside the application form.",
        uses: ["heading", "body", "image"],
      },
    ],
  },
  {
    key: "contact",
    label: "Contact Us",
    path: "/contact",
    blocks: [
      {
        key: "intro",
        label: "Page introduction",
        where: "The subtext under the Contact Us hero title.",
        uses: ["heading", "subheading", "body"],
      },
    ],
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    path: "/privacy-policy",
    blocks: [
      {
        key: "body",
        label: "Policy text",
        where: "The whole page body.",
        uses: ["heading", "body"],
      },
    ],
  },
  {
    key: "terms",
    label: "Terms & Conditions",
    path: "/terms-conditions",
    blocks: [
      {
        key: "body",
        label: "Terms text",
        where: "The whole page body.",
        uses: ["heading", "body"],
      },
    ],
  },
];

/**
 * Card grids and counters are not page blocks — they live in their own tables
 * and are edited on the Sections screen (RTPP-44). Saying so here stops an
 * editor hunting for them among these blocks.
 */
export const SECTIONS_ELSEWHERE = {
  home: "The USP strip, stat counters, testimonials and latest news are edited on Sections.",
  about: "The Values cards, strength icons, stat band and certifications are on Sections.",
  quality: "The commitment grid, the five-step process and certifications are on Sections.",
  dealer: "The benefit cards, network counters and the five-step timeline are on Sections.",
  contact: "The assurance strip along the bottom is on Sections.",
};

const PAGE_BY_KEY = new Map(PAGES.map((page) => [page.key, page]));

export const pageOf = (key) => PAGE_BY_KEY.get(key);

/**
 * Merge the designed catalogue with what the API actually returned.
 *
 * Designed blocks with no row come back as placeholders so they can be created.
 * Rows that are not in the catalogue are appended rather than dropped — a block
 * added server-side must not become unreachable here.
 */
export function blocksForPage(pageKey, rows = []) {
  const designed = pageOf(pageKey)?.blocks ?? [];
  const byKey = new Map(rows.map((row) => [row.block_key, row]));

  const merged = designed.map((block) => ({
    ...block,
    row: byKey.get(block.key) ?? null,
    designed: true,
  }));

  const extras = rows
    .filter((row) => !designed.some((block) => block.key === row.block_key))
    .map((row) => ({
      key: row.block_key,
      label: row.heading || row.block_key,
      where: "Added outside the designed set.",
      uses: ["eyebrow", "heading", "subheading", "body", "bullet_points", "image", "cta"],
      row,
      designed: false,
    }));

  return [...merged, ...extras];
}
