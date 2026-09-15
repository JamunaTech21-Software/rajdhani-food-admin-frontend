import assert from "node:assert/strict";
import { test } from "node:test";

import { productSchema, toApiBody, toFormValues } from "../src/modules/products/productSchema.js";

const validForm = (overrides = {}) => ({
  ...toFormValues(null),
  name: "Rajdhani Premium Tea",
  category_id: "01M2CYEKMKA40SX9HMY86G9YEB",
  status: "DRAFT",
  is_featured: false,
  pack_sizes: [],
  highlights: [],
  images: [],
  ...overrides,
});

const packSize = (overrides = {}) => ({
  label: "500g",
  sku: "RPT-500",
  price: "450",
  compare_price: "",
  price_includes_vat: true,
  is_default: true,
  is_available: true,
  ...overrides,
});

test("sort_order comes from array position, not from the form", () => {
  const body = toApiBody({
    ...validForm(),
    pack_sizes: [
      { ...packSize({ sku: "A" }), price: 1 },
      { ...packSize({ sku: "B" }), price: 2 },
      { ...packSize({ sku: "C" }), price: 3 },
    ],
    highlights: [{ title: "One" }, { title: "Two" }],
    images: [{ media_id: "m1", is_primary: true }, { media_id: "m2", is_primary: false }],
  });

  assert.deepEqual(body.pack_sizes.map((s) => s.sort_order), [1, 2, 3]);
  assert.deepEqual(body.highlights.map((h) => h.sort_order), [1, 2]);
  assert.deepEqual(body.images.map((i) => i.sort_order), [1, 2]);
});

test("server-owned and read-only fields are never sent back", () => {
  const body = toApiBody({
    ...validForm(),
    pack_sizes: [packSize()],
    images: [{ media_id: "m1", url: "https://cdn/x.png", alt: "Alt text", is_primary: true }],
  });

  // discount_percent is derived by the API from price and compare_price.
  assert.ok(!("discount_percent" in body.pack_sizes[0]), "must not send discount_percent");

  // url and alt belong to the media asset, not the product-image join row.
  assert.deepEqual(Object.keys(body.images[0]).sort(), ["is_primary", "media_id", "sort_order"]);

  for (const field of ["view_count", "rating_average", "rating_count", "id", "created_at", "updated_at"]) {
    assert.ok(!(field in body), `must not send ${field}`);
  }
});

test("empty optional strings become null, not empty strings", () => {
  const body = toApiBody(validForm({ tagline: "", short_description: "", meta_title: "" }));

  assert.equal(body.tagline, null);
  assert.equal(body.short_description, null);
  assert.equal(body.meta_title, null);
  // An empty slug means "derive it", so it must be absent rather than null.
  assert.equal(body.slug, undefined);
});

test("a duplicate SKU is caught on the offending row", () => {
  const result = productSchema.safeParse(
    validForm({
      pack_sizes: [packSize({ sku: "RPT-500" }), packSize({ label: "1kg", sku: "rpt-500" })],
    }),
  );

  assert.equal(result.success, false);
  const issue = result.error.issues.find((i) => i.path.join(".") === "pack_sizes.1.sku");
  assert.ok(issue, "the error must point at the second row, not the form");
  assert.match(issue.message, /already used/i);
});

test("a compare price at or below the price is rejected", () => {
  const tooLow = productSchema.safeParse(
    validForm({ pack_sizes: [packSize({ price: "450", compare_price: "400" })] }),
  );
  assert.equal(tooLow.success, false);
  assert.ok(tooLow.error.issues.some((i) => i.path.join(".") === "pack_sizes.0.compare_price"));

  const valid = productSchema.safeParse(
    validForm({ pack_sizes: [packSize({ price: "450", compare_price: "500" })] }),
  );
  assert.equal(valid.success, true, "a genuine discount is allowed");
});

test("number inputs arrive as strings and are coerced", () => {
  const result = productSchema.safeParse(
    validForm({ pack_sizes: [packSize({ price: "450.50", compare_price: "500" })] }),
  );

  assert.equal(result.success, true);
  assert.equal(result.data.pack_sizes[0].price, 450.5);
  assert.equal(result.data.pack_sizes[0].compare_price, 500);
});

test("a blank compare price is null, not zero", () => {
  const result = productSchema.safeParse(
    validForm({ pack_sizes: [packSize({ compare_price: "" })] }),
  );

  assert.equal(result.success, true);
  assert.equal(result.data.pack_sizes[0].compare_price, null, "zero would render as a 100% discount");
});

test("name and category are required", () => {
  assert.equal(productSchema.safeParse(validForm({ name: "" })).success, false);
  assert.equal(productSchema.safeParse(validForm({ category_id: "" })).success, false);
});

test("toFormValues fills nulls with the empty strings inputs need", () => {
  const values = toFormValues({
    id: "p1",
    name: "Tea",
    category_id: "c1",
    slug: "tea",
    tagline: null,
    meta_title: null,
    key_features: null,
    pack_sizes: [{ label: "1kg", sku: "T-1", price: 900, compare_price: null }],
    highlights: [{ title: "Natural", subtitle: null, icon_name: null }],
    images: [],
  });

  // A null in a controlled input makes React warn and the field uncontrolled.
  assert.equal(values.tagline, "");
  assert.equal(values.meta_title, "");
  assert.deepEqual(values.key_features, []);
  assert.equal(values.pack_sizes[0].compare_price, "");
  assert.equal(values.highlights[0].subtitle, "");
  assert.equal(values.highlights[0].icon_name, null, "icon_name stays null — the picker expects it");
});
