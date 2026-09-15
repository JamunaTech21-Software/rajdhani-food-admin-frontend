import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, X } from "lucide-react";
import { useId, useState } from "react";

import { Icon } from "../../components/ui/Icon.jsx";
import { iconNames } from "../../components/ui/icon-registry.js";
import { cn } from "../../lib/cn.js";

/**
 * Picks an `icon_name` for a category.
 *
 * Constrained to the icon registry rather than a free-text field: the value is
 * rendered by the customer site, and a name nothing resolves shows the fallback
 * glyph to every visitor. An editor should not be able to type that by accident.
 */
export function IconPicker({ value, onChange, label = "Icon", error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = useId();

  const matches = iconNames.filter((name) => name.includes(query.trim().toLowerCase()));

  function choose(name) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </span>

      <div className="flex items-center gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            aria-labelledby={`${id}-label`}
            className={cn(
              "flex h-11 flex-1 items-center gap-2 rounded-md border bg-surface px-3 text-sm",
              error ? "border-danger" : "border-line hover:border-line-strong",
            )}
          >
            {value ? (
              <>
                <Icon name={value} size={18} className="text-brand" />
                <span className="text-ink">{value}</span>
              </>
            ) : (
              <span className="text-ink-subtle">Choose an icon</span>
            )}
            <ChevronDown size={15} strokeWidth={2} className="ml-auto text-ink-subtle" aria-hidden="true" />
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className="z-50 w-72 rounded-md border border-line bg-surface p-2 shadow-card"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons"
                aria-label="Search icons"
                className="mb-2 h-9 w-full rounded-md border border-line px-2.5 text-sm"
              />

              {matches.length ? (
                <ul className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
                  {matches.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => choose(name)}
                        title={name}
                        aria-label={name}
                        aria-pressed={value === name}
                        className={cn(
                          "grid aspect-square w-full place-items-center rounded-md",
                          value === name
                            ? "bg-brand text-on-brand"
                            : "text-ink-muted hover:bg-brand-tint hover:text-brand",
                        )}
                      >
                        <Icon name={name} size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-4 text-center text-sm text-ink-muted">
                  No icon matches “{query}”.
                </p>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Clear icon"
            className="grid size-11 shrink-0 place-items-center rounded-md border border-line text-ink-subtle hover:text-ink"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
