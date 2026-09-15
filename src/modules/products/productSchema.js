import { z } from "zod";

/** Number inputs hand back strings; an empty one means "not set", not zero. */
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().min(0, "Must be zero or more").nullable(),
);

const requiredNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? Number.NaN : Number(value)),
  z.number({ invalid_type_error: "Enter a price" }).min(0, "Must be zero or more"),
);

const emptyToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const packSizeSchema = z.object({
  label: z.string().min(1, "Enter a size").max(64),
  sku: z.string().min(1, "Enter a SKU").max(64),
  price: requiredNumber,
  compare_price: optionalNumber,
  price_includes_vat: z.boolean(),
  is_default: z.boolean(),
  is_available: z.boolean(),
});

export const highlightSchema = z.object({
  title: z.string().min(1, "Enter a title").max(255),
  subtitle: z.string().nullish(),
  icon_name: z.string().nullish(),
});

export const imageSchema = z.object({
  media_id: z.string(),
  url: z.string().nullish(),
  alt: z.string().nullish(),
  is_primary: z.boolean(),
});

export const productSchema = z
  .object({
    name: z.string().min(1, "Enter a product name").max(255),
    category_id: z.string().min(1, "Choose a category"),
    slug: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
        .max(191)
        .optional(),
    ),
    tagline: z.string().max(255).nullish(),
    short_description: z.string().nullish(),
    description: z.string().nullish(),
    ingredients: z.string().nullish(),
    nutrition_info: z.string().nullish(),
    brewing_guide: z.string().nullish(),
    packaging_info: z.string().nullish(),
    key_features: z.array(z.string()).nullish(),
    badge_text: z.string().max(64).nullish(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    is_featured: z.boolean(),
    meta_title: z.string().max(255).nullish(),
    meta_description: z.string().nullish(),
    pack_sizes: z.array(packSizeSchema),
    highlights: z.array(highlightSchema),
    images: z.array(imageSchema),
  })
  .superRefine((value, ctx) => {
    // The database enforces this globally; catching it here saves a round trip
    // and points at the offending row rather than the whole form.
    const seen = new Map();
    value.pack_sizes.forEach((size, index) => {
      const sku = size.sku?.trim().toLowerCase();
      if (!sku) return;
      if (seen.has(sku)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pack_sizes", index, "sku"],
          message: "This SKU is already used by another pack size",
        });
      }
      seen.set(sku, index);
    });

    value.pack_sizes.forEach((size, index) => {
      if (size.compare_price !== null && size.compare_price <= size.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pack_sizes", index, "compare_price"],
          message: "Must be higher than the price to show as a discount",
        });
      }
    });
  });

export const EMPTY_PRODUCT = {
  name: "",
  category_id: "",
  slug: "",
  tagline: "",
  short_description: "",
  description: null,
  ingredients: null,
  nutrition_info: null,
  brewing_guide: null,
  packaging_info: null,
  key_features: [],
  badge_text: "",
  status: "DRAFT",
  is_featured: false,
  meta_title: "",
  meta_description: "",
  pack_sizes: [],
  highlights: [],
  images: [],
};

export function toFormValues(product) {
  if (!product) return EMPTY_PRODUCT;

  return {
    ...EMPTY_PRODUCT,
    ...product,
    slug: product.slug ?? "",
    tagline: product.tagline ?? "",
    short_description: product.short_description ?? "",
    badge_text: product.badge_text ?? "",
    meta_title: product.meta_title ?? "",
    meta_description: product.meta_description ?? "",
    key_features: product.key_features ?? [],
    pack_sizes: (product.pack_sizes ?? []).map((size) => ({
      label: size.label ?? "",
      sku: size.sku ?? "",
      price: size.price ?? "",
      compare_price: size.compare_price ?? "",
      price_includes_vat: size.price_includes_vat ?? true,
      is_default: size.is_default ?? false,
      is_available: size.is_available ?? true,
    })),
    highlights: (product.highlights ?? []).map((h) => ({
      title: h.title ?? "",
      subtitle: h.subtitle ?? "",
      icon_name: h.icon_name ?? null,
    })),
    images: (product.images ?? []).map((image) => ({
      media_id: image.media_id,
      url: image.url,
      alt: image.alt,
      is_primary: image.is_primary ?? false,
    })),
  };
}

/**
 * Form values to the API body.
 *
 * `sort_order` is assigned from array position — the drag handles are the only
 * thing that sets it. `discount_percent` is never sent: the API derives it, and
 * `url`/`alt` are read-only projections of the media asset.
 */
export function toApiBody(values) {
  return {
    name: values.name,
    category_id: values.category_id,
    slug: values.slug?.trim() || undefined,
    tagline: values.tagline || null,
    short_description: values.short_description || null,
    description: values.description || null,
    ingredients: values.ingredients || null,
    nutrition_info: values.nutrition_info || null,
    brewing_guide: values.brewing_guide || null,
    packaging_info: values.packaging_info || null,
    key_features: values.key_features?.length ? values.key_features : null,
    badge_text: values.badge_text || null,
    status: values.status,
    is_featured: values.is_featured,
    meta_title: values.meta_title || null,
    meta_description: values.meta_description || null,

    pack_sizes: values.pack_sizes.map((size, index) => ({
      label: size.label,
      sku: size.sku,
      price: size.price,
      compare_price: size.compare_price,
      price_includes_vat: size.price_includes_vat,
      is_default: size.is_default,
      is_available: size.is_available,
      sort_order: index + 1,
    })),

    highlights: values.highlights.map((highlight, index) => ({
      title: highlight.title,
      subtitle: highlight.subtitle || null,
      icon_name: highlight.icon_name || null,
      sort_order: index + 1,
    })),

    images: values.images.map((image, index) => ({
      media_id: image.media_id,
      is_primary: image.is_primary,
      sort_order: index + 1,
    })),
  };
}
