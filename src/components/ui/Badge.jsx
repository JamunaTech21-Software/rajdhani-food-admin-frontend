import { cn } from "../../lib/cn.js";

const TONES = {
  neutral: "bg-ground text-ink-muted",
  brand: "bg-brand-tint text-brand",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  info: "bg-info-tint text-info",
  gold: "bg-gold-tint text-on-gold",
};

// The §8.1 content_status enum. Deliberately not brand-derived: a green brand
// colour must not be able to make PUBLISHED and DRAFT look the same.
const STATUS_TONE = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const STATUS_LABEL = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>
  );
}
