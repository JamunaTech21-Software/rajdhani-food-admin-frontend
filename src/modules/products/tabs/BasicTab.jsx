import { Controller } from "react-hook-form";

import { Checkbox, Field, Select, Textarea } from "../../../components/ui/Field.jsx";

const STATUSES = [
  ["DRAFT", "Draft — not visible on the site"],
  ["PUBLISHED", "Published — live"],
  ["ARCHIVED", "Archived — hidden, kept for reference"],
];

export function BasicTab({ register, control, errors, categories, isNew }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field
        label="Product name"
        required
        autoFocus
        className="md:col-span-2"
        error={errors.name?.message}
        {...register("name")}
      />

      <Select label="Category" required error={errors.category_id?.message} {...register("category_id")}>
        <option value="">Choose a category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>

      <Field
        label="Slug"
        hint={isNew ? "Generated from the name if left blank." : undefined}
        placeholder="rajdhani-premium-tea"
        error={errors.slug?.message}
        {...register("slug")}
      />

      <Field
        label="Tagline"
        placeholder="Strong • Refreshing • 100% Natural"
        className="md:col-span-2"
        error={errors.tagline?.message}
        {...register("tagline")}
      />

      <Textarea
        label="Short description"
        hint="The blurb on product cards."
        rows={3}
        className="md:col-span-2"
        error={errors.short_description?.message}
        {...register("short_description")}
      />

      <Controller
        control={control}
        name="key_features"
        render={({ field }) => (
          <Textarea
            label="Key features"
            hint="One per line. Shown as a ticked list on the product page."
            rows={5}
            className="md:col-span-2"
            value={(field.value ?? []).join("\n")}
            onChange={(e) =>
              field.onChange(
                e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              )
            }
            onBlur={field.onBlur}
          />
        )}
      />

      <Select label="Status" error={errors.status?.message} {...register("status")}>
        {STATUSES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Field
        label="Badge text"
        placeholder="BEST SELLER"
        hint="The corner ribbon on the product card."
        error={errors.badge_text?.message}
        {...register("badge_text")}
      />

      <div className="flex items-end md:col-span-2">
        <Checkbox
          label="Feature on the home page"
          description="Featured products appear in the home carousel."
          {...register("is_featured")}
        />
      </div>
    </div>
  );
}
