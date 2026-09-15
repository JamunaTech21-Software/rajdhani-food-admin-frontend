import { useWatch } from "react-hook-form";

import { Field, Textarea } from "../../../components/ui/Field.jsx";
import { publicUrl } from "../../../lib/publicUrl.js";

// Rough limits before Google truncates. Advisory, not enforced — the API does
// not reject a long one, and an editor may have a reason.
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function CountHint({ value, limit }) {
  const length = (value ?? "").length;
  const over = length > limit;

  return (
    <span className={over ? "text-warning" : "text-ink-muted"}>
      {length} / {limit}
      {over ? " — likely to be truncated in search results" : ""}
    </span>
  );
}

export function SeoTab({ register, control, errors }) {
  const [metaTitle, metaDescription, name, slug] = useWatch({
    control,
    name: ["meta_title", "meta_description", "name", "slug"],
  });

  const shownTitle = metaTitle || name || "Product name";
  // Through the shared builder, so the preview cannot show a URL shape the
  // real "View on site" link does not use.
  const shownUrl = publicUrl("product", slug || "product-slug");

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Meta title"
        hint={<CountHint value={metaTitle} limit={TITLE_LIMIT} />}
        placeholder={name || "Falls back to the product name"}
        error={errors.meta_title?.message}
        {...register("meta_title")}
      />

      <Textarea
        label="Meta description"
        rows={3}
        hint={<CountHint value={metaDescription} limit={DESCRIPTION_LIMIT} />}
        error={errors.meta_description?.message}
        {...register("meta_description")}
      />

      <div className="rounded-md border border-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Search preview
        </p>
        <p className="truncate text-sm text-info">{shownTitle}</p>
        <p className="truncate text-xs text-success">{shownUrl}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
          {metaDescription || "No meta description set — search engines will pick their own text."}
        </p>
      </div>
    </div>
  );
}
