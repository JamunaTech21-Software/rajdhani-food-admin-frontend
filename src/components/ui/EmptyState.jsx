import { IconChip } from "./Icon.jsx";

/**
 * Shown when a list is legitimately empty — a fresh install has no enquiries,
 * no applications and no reviews, and RTPP-40's acceptance criteria require the
 * page to read well in exactly that state rather than looking broken.
 */
export function EmptyState({ icon = "boxes", title, description, action, className }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <IconChip name={icon} size={22} chipClassName="size-12" />
        <p className="mt-3 text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

/** The failure twin of EmptyState — empty because something broke, not because there is nothing. */
export function ErrorState({ title = "Could not load this", description, action, className }) {
  return (
    <div className={className} role="alert">
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="inline-grid size-12 place-items-center rounded-full bg-danger-tint text-danger">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5" strokeLinecap="round" />
            <circle cx="12" cy="16.25" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <p className="mt-3 text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
