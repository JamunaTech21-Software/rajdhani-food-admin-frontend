import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Field } from "../../../components/ui/Field.jsx";
import { IconPicker } from "../../categories/IconPicker.jsx";

const BLANK = { title: "", subtitle: "", icon_name: null };

export function HighlightsTab({ control, register, errors }) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "highlights" });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          The icon row beneath the product title — “100% Natural”, “Rich Aroma”, and so on.
        </p>
        <Button variant="secondary" size="sm" onClick={() => append(BLANK)}>
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          Add highlight
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          No highlights yet. They are optional — the row is hidden if empty.
        </p>
      ) : (
        <SortableList
          items={fields}
          onReorder={(_next, from, to) => move(from, to)}
          className="divide-y divide-line rounded-md border border-line"
        >
          {(field, index) => (
            <SortableRow key={field.id} id={field.id} className="items-start px-4 py-4">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Field
                  label="Title"
                  required
                  placeholder="100% Natural"
                  error={errors?.highlights?.[index]?.title?.message}
                  {...register(`highlights.${index}.title`)}
                />
                <Field
                  label="Subtitle"
                  placeholder="No added preservatives"
                  error={errors?.highlights?.[index]?.subtitle?.message}
                  {...register(`highlights.${index}.subtitle`)}
                />
                <Controller
                  control={control}
                  name={`highlights.${index}.icon_name`}
                  render={({ field: iconField }) => (
                    <IconPicker value={iconField.value} onChange={iconField.onChange} />
                  )}
                />
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove highlight ${index + 1}`}
                className="mt-6 grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </SortableRow>
          )}
        </SortableList>
      )}
    </div>
  );
}
