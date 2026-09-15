import { useId, useState } from "react";

import { cn } from "../../lib/cn.js";
import { controlClass } from "../../components/ui/control-class.js";
import { isHexColour, toSwatch } from "./hexColour.js";

/**
 * A hex colour, edited as text with a native swatch beside it.
 *
 * The text is the source of truth: the API stores a hex string and accepts
 * shorthand and alpha, neither of which `<input type="color">` can express, so
 * typing has to stay possible.
 *
 * There is no default colour written here — this file is not on the
 * no-colour-literals allowlist, and rightly so. When the stored value is not a
 * valid hex the swatch has nothing real to show, so it is disabled rather than
 * silently seeded with black.
 */
export function ColourField({ label, hint, value, onChange, error, className }) {
  const id = useId();
  const [touched, setTouched] = useState(false);

  const swatch = toSwatch(value);
  const invalid = Boolean(error) || (touched && value !== "" && !isHexColour(value));
  const describedBy = [hint && `${id}-hint`, invalid && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {swatch ? (
          <input
            type="color"
            value={swatch}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} — colour picker`}
            className="size-11 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-1"
          />
        ) : (
          <span
            aria-hidden="true"
            title="No colour set"
            className="grid size-11 shrink-0 place-items-center rounded-md border border-dashed border-line-strong text-xs text-ink-subtle"
          >
            —
          </span>
        )}

        <input
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          spellCheck={false}
          placeholder="#RRGGBB"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(invalid), "h-11 px-3 font-mono")}
        />
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}

      {invalid ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error ?? "Use a hex colour such as #RRGGBB"}
        </p>
      ) : null}
    </div>
  );
}
