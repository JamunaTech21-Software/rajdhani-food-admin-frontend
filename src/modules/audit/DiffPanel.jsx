import { ArrowRight } from "lucide-react";

import { cn } from "../../lib/cn.js";
import { CHANGE_KIND, changeKind, diffRows } from "./auditDiff.js";

function Value({ value, className }) {
  return (
    <span className={cn(value.empty ? "italic text-ink-subtle" : "text-ink", className)}>
      {value.text}
    </span>
  );
}

const HEADING = {
  [CHANGE_KIND.CREATE]: "Created with",
  [CHANGE_KIND.DELETE]: "Removed, last holding",
  [CHANGE_KIND.UPDATE]: "What changed",
};

/**
 * The before/after diff, as fields rather than a JSON blob.
 *
 * A create has no "before" to show and a delete no "after", so those render as
 * a single column — an update's two-column layout would put "Not set →" against
 * every field of a newly created row and read as though something was
 * overwritten.
 */
export function DiffPanel({ entry }) {
  const rows = diffRows(entry);
  const kind = changeKind(entry);
  const single = kind !== CHANGE_KIND.UPDATE;

  // Two ways to land here: a reorder or bulk action, which touches several rows
  // and so records no single before/after; or a save where nothing actually
  // differed, which the API compacts to an empty pair.
  if (rows.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-ink-muted">
        No fields changed. Either this action affected several rows at once — a reorder or a bulk
        approval — or the save left every value as it was.
      </p>
    );
  }

  return (
    <div className="px-5 py-4">
      <h4 className="text-eyebrow uppercase text-ink-subtle">{HEADING[kind]}</h4>

      <dl className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.field}
            className={cn(
              "gap-1 border-b border-line pb-3 last:border-0 last:pb-0",
              row.long ? "flex flex-col" : "grid sm:grid-cols-[12rem_1fr] sm:gap-4",
            )}
          >
            <dt className="text-sm font-medium text-ink">{row.label}</dt>

            <dd className="min-w-0 text-sm">
              {single ? (
                <Value value={kind === CHANGE_KIND.DELETE ? row.from : row.to} />
              ) : row.long ? (
                // Side by side would wrap a paragraph into an unreadable
                // column, so a long value gets stacked blocks instead.
                <div className="flex flex-col gap-2">
                  <div className="rounded-md bg-danger-tint px-3 py-2">
                    <span className="mb-0.5 block text-xs font-medium text-danger">Before</span>
                    <Value value={row.from} className="whitespace-pre-wrap break-words" />
                  </div>
                  <div className="rounded-md bg-success-tint px-3 py-2">
                    <span className="mb-0.5 block text-xs font-medium text-success">After</span>
                    <Value value={row.to} className="whitespace-pre-wrap break-words" />
                  </div>
                </div>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <Value value={row.from} className="line-through decoration-ink-subtle/50" />
                  <ArrowRight size={13} strokeWidth={2} aria-hidden="true" className="shrink-0 text-ink-subtle" />
                  <Value value={row.to} className="font-medium" />
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
