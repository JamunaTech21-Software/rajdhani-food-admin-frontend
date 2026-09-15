import { Field, Textarea } from "../../../components/ui/Field.jsx";

/**
 * The contact block and the map pin.
 *
 * Both halves feed the public contact page (§10.4). The coordinates are kept
 * beside the address deliberately — they describe the same place, and splitting
 * them is how one gets updated after a move and the other does not.
 */
export function ContactTab({ values, setValue, fieldErrors }) {
  const field = (name) => ({
    value: values[name] ?? "",
    onChange: (event) => setValue(name, event.target.value),
    error: fieldErrors[name],
  });

  const hasOneCoordinate =
    Boolean(values.map_latitude?.trim()) !== Boolean(values.map_longitude?.trim());

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">Address</h3>

        <Field label="Street address" {...field("address_line")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" {...field("city")} />
          <Field label="Country" {...field("country")} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">How people reach you</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" type="tel" {...field("phone_primary")} />
          <Field label="Second phone" type="tel" hint="Optional." {...field("phone_secondary")} />
          <Field label="Email" type="email" {...field("email_primary")} />
          <Field
            label="Second email"
            type="email"
            hint="Optional."
            {...field("email_secondary")}
          />
        </div>

        <Field label="Website" placeholder="https://" {...field("website_url")} />

        <Textarea
          label="Business hours"
          rows={2}
          hint="Free text, shown as written — for example “Sat–Thu, 9am–6pm”."
          {...field("business_hours")}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">Map</h3>
        <p className="-mt-3 max-w-prose text-sm text-ink-muted">
          Leave both coordinates empty to show no map at all. They are stored as “unset” rather than
          zero, because 0, 0 is a real location in the Gulf of Guinea and would drop a pin there.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            placeholder="23.8103"
            {...field("map_latitude")}
          />
          <Field
            label="Longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            placeholder="90.4125"
            {...field("map_longitude")}
          />
        </div>

        {hasOneCoordinate ? (
          <p role="alert" className="rounded-md bg-warning-tint px-3 py-2.5 text-sm text-warning">
            A pin needs both numbers. With only one set, the map will not render.
          </p>
        ) : null}

        <Field
          label="Map embed URL"
          hint="Optional. An embed link overrides the pin above."
          placeholder="https://www.google.com/maps/embed?..."
          {...field("map_embed_url")}
        />
      </section>
    </div>
  );
}
