import { Star, Trash2 } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { MediaPicker } from "../../../components/ui/MediaPicker.jsx";

/**
 * Gallery order, primary selection, and adding or removing images.
 *
 * `ProductImageInput` accepts only `media_id`, `is_primary` and `sort_order`, so
 * alt text is not editable here — it belongs to the *media asset*, and the
 * picker links through to the library where it can be changed once for every
 * place the image is used.
 */
export function ImagesTab({ control, setValue }) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "images" });
  const images = useWatch({ control, name: "images" }) ?? [];

  function makePrimary(index) {
    fields.forEach((_, i) => setValue(`images.${i}.is_primary`, i === index, { shouldDirty: true }));
  }

  function add(_id, asset) {
    if (!asset) return;
    if (images.some((image) => image.media_id === asset.id)) return; // already on this product

    append({
      media_id: asset.id,
      url: asset.secure_url,
      alt: asset.alt_text,
      // The first image added becomes the card image by default.
      is_primary: images.length === 0,
    });
  }

  return (
    <div>
      <div className="mb-5">
        <MediaPicker
          label="Add an image"
          hint="Choose from the library or upload. Pick again to add another."
          resource="products"
          value={null}
          onChange={add}
        />
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          This product has no images yet.
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted">
            Drag to set the gallery order. The primary image is the one used on product cards.
          </p>

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
                      {image.alt || (
                        <span className="italic text-ink-subtle">
                          No alt text — set it in the media library
                        </span>
                      )}
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
        </>
      )}
    </div>
  );
}
