import { useId } from "react";

import { cn } from "../../lib/cn.js";
import { controlClass } from "./control-class.js";
import { FieldFrame } from "./FieldFrame.jsx";

// React 19 passes `ref` as an ordinary prop, so react-hook-form's register()
// spread carries its ref straight through to the control — no forwardRef needed.
export function Field({ label, required = false, error, hint, icon = null, className, ...props }) {
  const uid = useId();

  return (
    <FieldFrame id={uid} label={label} required={required} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
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
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(invalid), "h-11", icon ? "pl-10 pr-3" : "px-3")}
            {...props}
          />
        </div>
      )}
    </FieldFrame>
  );
}

export function Textarea({ label, required = false, error, hint, className, rows = 4, ...props }) {
  const uid = useId();

  return (
    <FieldFrame id={uid} label={label} required={required} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(invalid), "px-3 py-2.5")}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

export function Select({ label, required = false, error, hint, className, children, ...props }) {
  const uid = useId();

  return (
    <FieldFrame id={uid} label={label} required={required} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(invalid), "h-11 px-3")}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldFrame>
  );
}

export function Checkbox({ label, description, className, ...props }) {
  const id = useId();

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-sm border-line-strong text-brand accent-[var(--color-brand)]"
        {...props}
      />
      <label htmlFor={id} className="text-sm text-ink">
        {label}
        {description ? <span className="block text-ink-muted">{description}</span> : null}
      </label>
    </div>
  );
}
