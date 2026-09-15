import { Field, Textarea } from "../../../components/ui/Field.jsx";

// Search engines truncate around these lengths. They are guidance, not limits —
// the API's own cap on meta_title is 255, and meta_description has none.
const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 160;

function LengthNote({ value, ideal }) {
  const length = (value ?? "").trim().length;
  if (length === 0) return null;

  return (
    <span className={length > ideal ? "text-warning" : "text-ink-subtle"}>
      {length} / {ideal} characters
      {length > ideal ? " — search results will cut this short" : null}
    </span>
  );
}

/**
 * Footer copy and the SEO fallbacks.
 *
 * These titles and descriptions are defaults: a page with its own meta overrides
 * them, and a page without falls back here. The shell renderer (RTPP-73) reads
 * the same values, so what is set here is what an unconfigured page shows.
 */
export function SeoTab({ values, setValue, fieldErrors }) {
  const field = (name) => ({
    value: values[name] ?? "",
    onChange: (event) => setValue(name, event.target.value),
    error: fieldErrors[name],
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">Footer</h3>

        <Textarea
          label="About text"
          rows={3}
          hint="The short paragraph in the first footer column."
          {...field("footer_about")}
        />
        <Field
          label="Copyright line"
          hint="Shown along the bottom. Written as-is, so include the year if you want one."
          {...field("copyright_text")}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">Search engine defaults</h3>
        <p className="-mt-3 max-w-prose text-sm text-ink-muted">
          Used by any page that has no meta of its own. A page with its own title keeps it.
        </p>

        <Field
          label="Default page title"
          hint={<LengthNote value={values.meta_title} ideal={TITLE_IDEAL} />}
          {...field("meta_title")}
        />
        <Textarea
          label="Default description"
          rows={3}
          hint={<LengthNote value={values.meta_description} ideal={DESCRIPTION_IDEAL} />}
          {...field("meta_description")}
        />
      </section>
    </div>
  );
}
