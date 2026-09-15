import { FileText, Handshake, Mail, Star, Users } from "lucide-react";
import { Link } from "react-router";

import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { formatNumber } from "../../lib/format.js";

// Dashboard chrome icons are chosen here, not by an editor, so they are imported
// directly rather than going through the content icon registry.
const CARDS = [
  { key: "new_enquiries", label: "New enquiries", icon: FileText, to: "/enquiries" },
  { key: "new_applications", label: "Dealer applications", icon: Handshake, to: "/applications" },
  { key: "unread_messages", label: "Unread messages", icon: Mail, to: "/messages" },
  { key: "pending_reviews", label: "Pending reviews", icon: Star, to: "/reviews" },
  { key: "subscribers", label: "Subscribers", icon: Users, to: "/subscribers" },
];

export function SummaryCards({ counts, isPending }) {
  if (isPending) {
    return (
      <div role="status" aria-label="Loading summary" aria-busy="true" className={GRID}>
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-lg bg-surface p-5 shadow-card">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  // The API omits counts a role may not see — `pending_reviews` is absent for a
  // Sales admin entirely. Keying off presence rather than re-deriving the §7.3
  // matrix here means the server stays the single source of that truth.
  const visible = CARDS.filter((card) => counts?.[card.key] !== undefined);

  return (
    <div className={GRID}>
      {visible.map(({ key, label, icon: Glyph, to }) => (
        <Link
          key={key}
          to={to}
          className="group rounded-lg bg-surface p-5 shadow-card transition-shadow duration-(--duration-fast) hover:shadow-raised"
        >
          <span className="inline-grid size-10 place-items-center rounded-full bg-brand-tint text-brand">
            <Glyph size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="mt-4 text-2xl font-semibold tabular-nums text-ink">
            {formatNumber(counts[key])}
          </p>
          <p className="mt-1 text-sm text-ink-muted group-hover:text-ink">{label}</p>
        </Link>
      ))}
    </div>
  );
}

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
