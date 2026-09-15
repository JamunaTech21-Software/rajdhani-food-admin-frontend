import { cn } from "../../lib/cn.js";

// The pulse is disabled globally by the prefers-reduced-motion rule in tokens.css.
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line", className)}
      {...props}
    />
  );
}

/** A labelled loading region, so assistive tech is told rather than shown. */
export function SkeletonBlock({ label = "Loading", className, children }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}
