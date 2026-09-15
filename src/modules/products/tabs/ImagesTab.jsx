import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";

/**
 * Reordering, primary selection and removal — everything `ProductImageInput`
 * actually accepts (`media_id`, `is_primary`, `sort_order`).
 *
 * Two things RTPP-41 asks for are blocked on endpoints that do not exist yet,
 * and are surfaced in the UI rather than faked:
 *   - adding an image needs the media library (`GET /admin/media`, 404) or a
 *     direct-to-Cloudinary upload, both RTPP-50
 *   - alt text is a property of the media asset, edited through
 *     `PATCH /admin/media/:id` (also 404) — it is not a field on the join row
 */
export function ImagesTab({ control, setValue }) {
  const { fields, remove, move } = useFieldArray({ control, name: "images" });
  const images = useWatch({ control, name: "images" }) ?? [];

  function makePrimary(index) {
    fields.forEach((_, i) => setValue(`images.${i}.is_primary`, i === index, { shouldDirty: true }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Drag to set the order of the gallery. The primary image is the one used on product
          cards.
        </p>
      </div>

      <p className="mb-4 flex items-start gap-2.5 rounded-md bg-info-tint p-3 text-sm text-info">
        <ImagePlus size={17} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          Adding images and editing alt text need the media library, which arrives with RTPP-50.
          Until then you can reorder, set the primary image and remove images here.
        </span>
      </p>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          This product has no images yet.
        </p>
      ) : (
        <SortableList
          items={fields}
          onReorder={(_next, from, to) => move(from, to)}
          className="divide-y divide-line rounded-md border border-line"
        >
          {(field, index) => {
            const image = images[index] ?? {};

            return (
              <SortableRow key={field.id} id={field.id} className="px-4 py-3">
                <img
                  src={image.url}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  className="size-14 shrink-0 rounded-md border border-line bg-ground object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {image.alt || <span className="text-ink-subtle">No alt text set</span>}
                  </p>
                  {image.is_primary ? (
                    <p className="mt-1">
                      <Badge tone="brand">Primary</Badge>
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => makePrimary(index)}
                  disabled={Boolean(image.is_primary)}
                  aria-label={`Make image ${index + 1} the primary image`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-gold-tint hover:text-on-gold disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Star
                    size={15}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={image.is_primary ? "fill-gold text-gold" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </SortableRow>
            );
          }}
        </SortableList>
      )}
    </div>
  );
}
