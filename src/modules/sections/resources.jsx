import { z } from "zod";

import { Badge, StatusBadge } from "../../components/ui/Badge.jsx";
import { IconChip } from "../../components/ui/Icon.jsx";
import { Stars } from "../../components/ui/Stars.jsx";

const text = (max = 255) => z.string().max(max).nullish();
const required = (message, max = 255) => z.string().min(1, message).max(max);

/**
 * A hex an editor typed, not one this codebase chose. Blank means "follow the
 * brand tint", which is the default and what keeps these chips on-theme when
 * primary_color changes — a stored hex is frozen, so the hint says so.
 */
const hexColour = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour in #RRGGBB form")
  .optional()
  .or(z.literal(""));

export const RESOURCES = [
  {
    id: "features",
    label: "Feature items",
    blurb: "The icon-and-text cards that run across the page sections.",
    endpoint: "/admin/feature-items",
    queryKey: ["admin", "feature-items"],
    scopeKey: "section",
    scopeLabel: "Section",
    scopes: [
      { value: "HOME_USP", label: "Home — USP strip", hint: "The four cards overlapping the hero." },
      { value: "HOME_WHY_US", label: "Home — why us" },
      { value: "ABOUT_VALUES", label: "About — values" },
      { value: "ABOUT_STRENGTH", label: "About — strength" },
      { value: "QUALITY_COMMITMENT", label: "Quality — commitment grid" },
      { value: "DEALER_BENEFITS", label: "Dealer — benefit cards" },
      { value: "CONTACT_ASSURANCE", label: "Contact — assurance strip" },
      { value: "PRODUCT_HIGHLIGHTS", label: "Products — closing strip" },
    ],
    fields: [
      { name: "title", type: "text", label: "Title", required: true },
      { name: "description", type: "textarea", label: "Description", rows: 2 },
      { name: "icon_name", type: "icon", label: "Icon" },
      {
        name: "icon_bg_color",
        type: "text",
        label: "Icon background",
        // Deliberately the format, not an example colour: a concrete suggestion
        // invites pasting the brand tint as a frozen value, which is the one
        // thing the hint is warning against.
        placeholder: "#RRGGBB",
        hint: "Leave blank to follow the brand colour. A fixed value will not change with the theme.",
      },
      { name: "is_active", type: "checkbox", label: "Active" },
      {
        name: "icon_image_id",
        type: "image",
        label: "Custom icon image",
        resource: "sections",
        hint: "Optional — overrides the icon above.",
      },
    ],
    schema: z.object({
      title: required("Enter a title"),
      description: text(2000),
      icon_name: z.string().nullish(),
      icon_bg_color: hexColour,
      is_active: z.boolean(),
      icon_image_id: z.string().nullish(),
    }),
    defaults: {
      title: "",
      description: "",
      icon_name: null,
      icon_bg_color: "",
      is_active: true,
      icon_image_id: null,
    },
    leading: (row) => <IconChip name={row.icon_name} size={17} chipClassName="size-9" />,
    primary: (row) => row.title,
    secondary: (row) => row.description,
  },

  {
    id: "process",
    label: "Process steps",
    blurb: "The numbered timelines — from garden to cup, how we make tea, and the rest.",
    endpoint: "/admin/process-steps",
    queryKey: ["admin", "process-steps"],
    scopeKey: "group",
    scopeLabel: "Timeline",
    scopes: [
      { value: "FROM_GARDEN_TO_CUP", label: "From garden to cup", hint: "The home page timeline." },
      { value: "HOW_WE_MAKE_TEA", label: "How we make tea" },
      { value: "QUALITY_PROCESS", label: "Quality process" },
      { value: "MANUFACTURING_PROCESS", label: "Manufacturing process" },
      { value: "BECOME_DEALER", label: "How to become a dealer" },
    ],
    fields: [
      {
        name: "step_number",
        type: "number",
        label: "Step number",
        required: true,
        min: 1,
        hint: "The number printed on the site. Dragging sets the display order — keep the two in step.",
      },
      { name: "title", type: "text", label: "Title", required: true },
      { name: "description", type: "textarea", label: "Description", rows: 2 },
      { name: "icon_name", type: "icon", label: "Icon" },
      { name: "is_active", type: "checkbox", label: "Active" },
      { name: "image_id", type: "image", label: "Step photograph", resource: "sections" },
    ],
    schema: z.object({
      step_number: z.coerce.number().int().min(1, "Steps start at 1"),
      title: required("Enter a title"),
      description: text(2000),
      icon_name: z.string().nullish(),
      is_active: z.boolean(),
      image_id: z.string().nullish(),
    }),
    defaults: {
      step_number: 1,
      title: "",
      description: "",
      icon_name: null,
      is_active: true,
      image_id: null,
    },
    leading: (row) => (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-on-brand">
        {String(row.step_number ?? "?").padStart(2, "0")}
      </span>
    ),
    primary: (row) => row.title,
    secondary: (row) => row.description,
  },

  {
    id: "stats",
    label: "Stat counters",
    blurb: "The big numbers — 25+ years, 500+ distributors, 64 districts.",
    endpoint: "/admin/stat-counters",
    queryKey: ["admin", "stat-counters"],
    scopeKey: "group",
    scopeLabel: "Band",
    scopes: [
      { value: "HOME", label: "Home" },
      { value: "ABOUT", label: "About" },
      { value: "GALLERY", label: "Gallery" },
      { value: "TEA_GARDEN", label: "Tea garden" },
      { value: "DEALER_NETWORK", label: "Dealer network" },
    ],
    fields: [
      {
        name: "value",
        type: "text",
        label: "Value",
        required: true,
        placeholder: "25+",
        hint: "Free text, so “100%” and “1000+” both work.",
      },
      { name: "label", type: "text", label: "Label", required: true, placeholder: "Years of Experience" },
      { name: "icon_name", type: "icon", label: "Icon" },
      { name: "is_active", type: "checkbox", label: "Active" },
    ],
    schema: z.object({
      value: required("Enter a value", 64),
      label: required("Enter a label"),
      icon_name: z.string().nullish(),
      is_active: z.boolean(),
    }),
    defaults: { value: "", label: "", icon_name: null, is_active: true },
    leading: (row) => <IconChip name={row.icon_name} size={17} chipClassName="size-9" />,
    primary: (row) => `${row.value} — ${row.label}`,
    secondary: () => null,
  },

  {
    id: "certifications",
    label: "Certifications",
    blurb: "The ISO, HACCP, Halal and BSTI marks shown on About and Quality.",
    endpoint: "/admin/certifications",
    queryKey: ["admin", "certifications"],
    scopeKey: null,
    fields: [
      { name: "name", type: "text", label: "Name", required: true, placeholder: "ISO 22000:2018" },
      { name: "subtitle", type: "text", label: "Subtitle", placeholder: "Food Safety Management" },
      { name: "is_active", type: "checkbox", label: "Active" },
      { name: "logo_id", type: "image", label: "Certification mark", resource: "certifications" },
      {
        name: "certificate_file_id",
        type: "image",
        label: "Certificate PDF",
        resource: "documents",
        kind: "raw",
        hint: "The scanned certificate itself, for visitors who want to verify it.",
      },
    ],
    schema: z.object({
      name: required("Enter a name"),
      subtitle: text(),
      is_active: z.boolean(),
      logo_id: z.string().nullish(),
      certificate_file_id: z.string().nullish(),
    }),
    defaults: {
      name: "",
      subtitle: "",
      is_active: true,
      logo_id: null,
      certificate_file_id: null,
    },
    leading: null,
    primary: (row) => row.name,
    secondary: (row) => row.subtitle,
  },

  {
    id: "testimonials",
    label: "Testimonials",
    blurb: "What clients say, on the home page.",
    endpoint: "/admin/testimonials",
    queryKey: ["admin", "testimonials"],
    scopeKey: null,
    fields: [
      { name: "quote", type: "textarea", label: "Quote", required: true, rows: 3 },
      { name: "author_name", type: "text", label: "Author", required: true },
      { name: "author_role", type: "text", label: "Role", placeholder: "Distributor, Chattogram" },
      { name: "rating", type: "rating", label: "Rating" },
      {
        name: "status",
        type: "select",
        label: "Status",
        options: [
          ["PUBLISHED", "Published"],
          ["DRAFT", "Draft"],
          ["ARCHIVED", "Archived"],
        ],
      },
      { name: "avatar_id", type: "image", label: "Author photograph", resource: "sections" },
    ],
    schema: z.object({
      quote: required("Enter the quote", 2000),
      author_name: required("Enter the author’s name"),
      author_role: text(),
      rating: z.coerce.number().int().min(1).max(5).nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
      avatar_id: z.string().nullish(),
    }),
    defaults: {
      quote: "",
      author_name: "",
      author_role: "",
      rating: null,
      status: "PUBLISHED",
      avatar_id: null,
    },
    leading: null,
    primary: (row) => row.author_name,
    secondary: (row) => row.quote,
    badges: (row) => (
      <>
        <Stars rating={row.rating} />
        <StatusBadge status={row.status} />
      </>
    ),
  },
];

export const resourceById = (id) => RESOURCES.find((r) => r.id === id) ?? RESOURCES[0];

/** The shared "inactive" marker, for resources that carry `is_active`. */
export const inactiveBadge = (row) =>
  row.is_active === false ? <Badge tone="neutral">Inactive</Badge> : null;
