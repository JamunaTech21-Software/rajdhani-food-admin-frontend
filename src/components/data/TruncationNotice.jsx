import { Info } from "lucide-react";

import { cn } from "../../lib/cn.js";
import { formatNumber } from "../../lib/format.js";

/**
 * Says so when a list is showing only part of what exists.
 *
 * A handful of screens fetch with a high fixed `limit` rather than paginating,
 * because they drag-to-reorder and a reorder needs every row in one place. That
 * is a reasonable trade, but it fails silently: at 201 banners the screen shows
 * 200, the editor reorders what they can see, and the missing one is invisible
 * with nothing on screen to suggest it exists.
 *
 * `meta.total` is what makes this detectable, so the fix is to compare rather
 * than to raise the cap — a bigger number would just move the cliff.
 */
export function TruncationNotice({ meta, shown, noun = "items", className }) {
  const total = meta?.total;
  if (!total || !shown || total <= shown) return null;

  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 border-t border-line bg-warning-tint px-5 py-3 text-sm text-warning",
        className,
      )}
    >
      <Info size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>
        Showing the first {formatNumber(shown)} of {formatNumber(total)} {noun}. Reordering here
        only affects the ones on screen — ask a developer to raise the limit before relying on it.
      </span>
    </p>
  );
}
