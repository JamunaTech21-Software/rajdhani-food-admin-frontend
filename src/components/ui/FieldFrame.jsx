import { cn } from "../../lib/cn.js";

/**
 * Label, required marker, hint and error text — the parts every control shares.
 * `children` receives the ids it must wire to for the labelling to be real.
 */
export function FieldFrame({ id, label, required = false, error, hint, className, children }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
