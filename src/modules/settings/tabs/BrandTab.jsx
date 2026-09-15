import { Field } from "../../../components/ui/Field.jsx";
import { MediaPicker } from "../../../components/ui/MediaPicker.jsx";
import { ColourField } from "../ColourField.jsx";

const LOGOS = [
  {
    field: "logo_light_id",
    label: "Logo",
    hint: "Used on light backgrounds — the header on most pages.",
  },
  {
    field: "logo_dark_id",
    label: "Logo (dark backgrounds)",
    hint: "Used on the footer and over hero images. Falls back to the main logo.",
  },
  {
    field: "favicon_id",
    label: "Favicon",
    hint: "The small icon in a browser tab. A square image works best.",
  },
  {
    field: "og_image_id",
    label: "Share image",
    hint: "Shown when a page is shared on social media. 1200×630 is the usual size.",
  },
];

const COLOURS = [
  {
    field: "primary_color",
    label: "Primary",
    hint: "The brand colour. Buttons, links and highlights are derived from it.",
  },
  {
    field: "secondary_color",
    label: "Secondary",
    hint: "The accent used for awards, certifications and premium touches.",
  },
  {
    field: "accent_color",
    label: "Accent",
    hint: "A supporting colour, used sparingly.",
  },
];

export function BrandTab({ values, setValue, fieldErrors, assets }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Site name"
            required
            value={values.name ?? ""}
            onChange={(event) => setValue("name", event.target.value)}
            error={fieldErrors.name}
          />
          <Field
            label="Tagline"
            hint="A short line under the name."
            value={values.tagline ?? ""}
            onChange={(event) => setValue("tagline", event.target.value)}
            error={fieldErrors.tagline}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Logos</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          Leave any of these empty and the site falls back to the name in text.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {LOGOS.map(({ field, label, hint }) => (
            <MediaPicker
              key={field}
              label={label}
              hint={hint}
              resource="pages"
              value={values[field] || null}
              // The picker hands back the asset too, but the profile stores
              // only the id — the read supplies the URL on the next fetch.
              onChange={(id) => setValue(field, id ?? "")}
            />
          ))}
        </div>

        {assets.favicon_id?.url ? (
          <p className="mt-3 text-sm text-ink-muted">
            The favicon is served from the media library, so replacing the file behind it updates
            every tab without a deploy.
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Theme</h3>
        <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
          Saving a new primary colour rebrands this dashboard straight away and the customer site on
          its next load. Nothing is hardcoded and nothing needs a deploy.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {COLOURS.map(({ field, label, hint }) => (
            <ColourField
              key={field}
              label={label}
              hint={hint}
              value={values[field] ?? ""}
              onChange={(value) => setValue(field, value)}
              error={fieldErrors[field]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
