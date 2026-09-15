import { useId } from "react";

import { cn } from "../../lib/cn.js";

// React 19 passes `ref` as an ordinary prop, so react-hook-form's register()
// spread carries its ref straight through to the input — no forwardRef needed.
export function Field({ label, required = false, error, hint, icon = null, className, ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        {icon ? (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}

        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-md border bg-surface text-sm text-ink",
            "placeholder:text-ink-subtle",
            "transition-colors duration-(--duration-fast)",
            "disabled:cursor-not-allowed disabled:opacity-60",
            icon ? "pl-10 pr-3" : "px-3",
            error ? "border-danger" : "border-line hover:border-line-strong",
          )}
          {...props}
        />
      </div>

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
