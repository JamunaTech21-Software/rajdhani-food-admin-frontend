import { Link } from "react-router";

import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { Stars } from "../../components/ui/Stars.jsx";
import { formatRelative } from "../../lib/format.js";

export function PendingReviews({ reviews, isPending, now }) {
  if (isPending) {
    return (
      <ul role="status" aria-label="Loading pending reviews" aria-busy="true" className="divide-y divide-line">
        {[0, 1, 2].map((i) => (
          <li key={i} className="px-5 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-56" />
          </li>
        ))}
      </ul>
    );
  }

  if (!reviews?.length) {
    return (
      <EmptyState
        icon="check-circle"
        title="Nothing awaiting moderation"
        description="New customer reviews appear here before they go live on the site."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {reviews.map((review) => (
        <li key={review.id}>
          <Link
            to="/reviews"
            className="block px-5 py-3 transition-colors duration-(--duration-fast) hover:bg-ground"
          >
            <div className="flex items-center justify-between gap-3">
              <Stars rating={review.rating} />
              <time
                dateTime={review.created_at}
                className="shrink-0 text-xs text-ink-subtle"
                title={review.created_at}
              >
                {formatRelative(review.created_at, now)}
              </time>
            </div>

            <p className="mt-1 truncate text-sm font-medium text-ink">
              {review.title || review.comment}
            </p>
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {review.customer?.name} on {review.product?.name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
