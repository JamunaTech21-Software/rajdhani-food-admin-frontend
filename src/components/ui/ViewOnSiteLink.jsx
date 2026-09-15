import { ExternalLink } from "lucide-react";

import { cn } from "../../lib/cn.js";
import { publicUrl } from "../../lib/publicUrl.js";

/**
 * "View on site", the one implementation (§11).
 *
 * `visible` is the caller's verdict, not this component's. Each resource decides
 * differently what "live" means — a news post is published *and* past its
 * scheduled date, a product is simply `PUBLISHED`, a download is `is_active` —
 * and the screen that owns the row knows its own rule. Guessing here would have
 * meant re-deriving it worse, in one place, for five different resources.
 *
 * Renders nothing when there is nothing to view: a link that 404s is worse than
 * no link, because it tells an editor the content is live when it is not.
 */
export function ViewOnSiteLink({
  kind,
  identifier,
  visible = true,
  label = "View on site",
  title,
  iconOnly = false,
  className,
}) {
  const href = visible ? publicUrl(kind, identifier) : null;
  if (!href) return null;

  // The accessible name says *what* is being opened — a table of twenty rows
  // otherwise reads as twenty links all called "View on site".
  const accessibleName = title ? `View ${title} on the site` : label;

  return (
    <a
      href={href}
      target="_blank"
      // noreferrer as well as noopener: this opens the public site, which has
      // no business knowing a dashboard URL.
      rel="noopener noreferrer"
      aria-label={iconOnly ? accessibleName : undefined}
      className={cn(
        iconOnly
          ? "grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
          : "inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline",
        className,
      )}
    >
      {iconOnly ? null : label}
      <ExternalLink size={iconOnly ? 15 : 13} strokeWidth={iconOnly ? 1.75 : 2} aria-hidden="true" className="shrink-0" />
    </a>
  );
}
