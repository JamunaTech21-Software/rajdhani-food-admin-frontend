import { X } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "../../lib/cn.js";

const normalise = (raw) => raw.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Tags as chips. Enter or comma commits, Backspace on an empty field removes the
 * last one — the conventions people already expect from a tag field.
 *
 * Tags are lower-cased and de-duplicated on entry, because "Tea Expo" and
 * "tea expo" would otherwise become two filters for one thing on the public site.
 */
export function TagInput({ value = [], onChange, label = "Tags", hint }) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add(raw) {
    const tag = normalise(raw);
    if (!tag) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>

      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface p-2",
          "focus-within:border-line-strong",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-tint py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="grid size-4 place-items-center rounded-full hover:bg-brand hover:text-on-brand"
            >
              <X size={11} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          // Commit whatever is half-typed rather than losing it on blur.
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : "Add a tag and press Enter"}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>

      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
