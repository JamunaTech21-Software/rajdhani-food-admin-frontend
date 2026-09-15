import { Check, Circle } from "lucide-react";

import { cn } from "../../lib/cn.js";
import { checkPassword } from "../../lib/passwordPolicy.js";

/**
 * The §7.2 rules, shown as a live checklist.
 *
 * A checklist rather than an error message because the API returns every unmet
 * rule at once — showing one failure per submission would waste round-trips and
 * misrepresent what the API actually said.
 *
 * `aria-live` is deliberately absent: the list updates on every keystroke, and
 * announcing five rules per character typed is unusable. The rules are visible
 * from the start and the submit button's disabled state carries the outcome.
 */
export function PasswordChecklist({ password, className }) {
  const rules = checkPassword(password);

  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {rules.map(({ id, label, met }) => (
        <li key={id} className="flex items-center gap-2 text-sm">
          {met ? (
            <Check size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-success" />
          ) : (
            <Circle size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-subtle" />
          )}
          <span className={met ? "text-ink-muted" : "text-ink"}>{label}</span>
          <span className="sr-only">{met ? " — met" : " — not yet met"}</span>
        </li>
      ))}
    </ul>
  );
}
