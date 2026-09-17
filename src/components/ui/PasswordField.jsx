import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "../../lib/cn.js";
import { controlClass } from "./control-class.js";
import { FieldFrame } from "./FieldFrame.jsx";

/**
 * A password control with a show/hide toggle.
 *
 * Typing a password you cannot see is where a mistyped one becomes a failed
 * sign-in, and a failed sign-in here costs a lockout after five (§7.2) — so
 * being able to check what you typed is worth more on this form than most.
 *
 * Three details the obvious version gets wrong:
 *
 *   * The toggle is a **`type="button"`**. Inside a form, a button with no type
 *     is a submit button, so revealing the password would post the form.
 *   * It is a real button in the tab order, not an icon with an `onClick`, and
 *     it says which state it is in — `aria-pressed` plus a name that changes.
 *     A control whose only signal is which of two similar glyphs is drawn is no
 *     signal at all to a screen reader.
 *   * Revealing does not disturb the field: focus and the caret stay where they
 *     were, because `type` is swapped on the same element rather than the input
 *     being replaced.
 *
 * The visible state is deliberately not remembered between page loads. It
 * resets to hidden every time, which is the state to be in by default on a
 * screen someone else might be standing behind.
 */
export function PasswordField({ label, required = false, error, hint, className, disabled, ...props }) {
  const uid = useId();
  const [visible, setVisible] = useState(false);

  return (
    <FieldFrame id={uid} label={label} required={required} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            required={required}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(invalid), "h-11 pl-3 pr-11")}
            {...props}
          />

          <button
            type="button"
            onClick={() => setVisible((shown) => !shown)}
            disabled={disabled}
            aria-pressed={visible}
            aria-controls={id}
            title={visible ? "Hide password" : "Show password"}
            className={cn(
              "absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md",
              "text-ink-subtle transition-colors duration-(--duration-fast)",
              "hover:bg-ground hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {visible ? (
              <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className="sr-only">{visible ? "Hide password" : "Show password"}</span>
          </button>
        </div>
      )}
    </FieldFrame>
  );
}
