import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Checkbox, Field } from "../../../components/ui/Field.jsx";

const BLANK = {
  label: "",
  sku: "",
  price: "",
  compare_price: "",
  price_includes_vat: true,
  is_default: false,
  is_available: true,
};

/** Preview only. The API derives `discount_percent` and ignores anything sent. */
function discountOf(price, comparePrice) {
  const p = Number(price);
  const c = Number(comparePrice);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0 || p >= c) return null;
  return Math.round((1 - p / c) * 100);
}

function Row({ index, field, control, register, errors, onRemove, onMakeDefault, canRemove }) {
  const [price, comparePrice, isDefault] = useWatch({
    control,
    name: [
      `pack_sizes.${index}.price`,
      `pack_sizes.${index}.compare_price`,
      `pack_sizes.${index}.is_default`,
    ],
  });

  const discount = discountOf(price, comparePrice);
  const rowErrors = errors?.pack_sizes?.[index] ?? {};

  return (
    <SortableRow id={field.id} className="items-start px-4 py-4">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Size"
          required
          placeholder="500g"
          error={rowErrors.label?.message}
          {...register(`pack_sizes.${index}.label`)}
        />
        <Field
          label="SKU"
          required
          placeholder="RPT-500"
          hint="Unique across every product."
          error={rowErrors.sku?.message}
          {...register(`pack_sizes.${index}.sku`)}
        />
        <Field
          label="Price"
          required
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          error={rowErrors.price?.message}
          {...register(`pack_sizes.${index}.price`)}
        />
        <div>
          <Field
            label="Compare price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            error={rowErrors.compare_price?.message}
            {...register(`pack_sizes.${index}.compare_price`)}
          />
          {discount !== null ? (
            <p className="mt-1.5">
              <Badge tone="success">{discount}% off</Badge>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
          <Checkbox label="Available" {...register(`pack_sizes.${index}.is_available`)} />
          <Checkbox label="Price includes VAT" {...register(`pack_sizes.${index}.price_includes_vat`)} />

          {/* Radio semantics on purpose: the API allows at most one default. */}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="pack_size_default"
              checked={Boolean(isDefault)}
              onChange={() => onMakeDefault(index)}
              className="size-4 accent-[var(--color-brand)]"
            />
            Default selection
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove pack size ${index + 1}`}
        className="mt-6 grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-subtle"
      >
        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </SortableRow>
  );
}

export function PackSizesTab({ control, register, errors, setValue }) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "pack_sizes" });

  function makeDefault(index) {
    fields.forEach((_, i) => setValue(`pack_sizes.${i}.is_default`, i === index, { shouldDirty: true }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Pack sizes carry the pricing shown on the product page. Drag to reorder.
        </p>
        <Button variant="secondary" size="sm" onClick={() => append(BLANK)}>
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          Add pack size
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          No pack sizes yet. A product needs at least one to show a price.
        </p>
      ) : (
        <SortableList
          items={fields}
          onReorder={(_next, from, to) => move(from, to)}
          className="divide-y divide-line rounded-md border border-line"
        >
          {(field, index) => (
            <Row
              key={field.id}
              index={index}
              field={field}
              control={control}
              register={register}
              errors={errors}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
              onMakeDefault={makeDefault}
            />
          )}
        </SortableList>
      )}
    </div>
  );
}
