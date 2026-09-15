import { Star } from "lucide-react";

import { cn } from "../../lib/cn.js";

/** A read-only 1–5 rating. The editable version lives in ResourceFormDialog. */
export function Stars({ rating, size = 13, className }) {
  if (!rating) return null;

  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          aria-hidden="true"
          className={n <= rating ? "fill-gold text-gold" : "text-line-strong"}
        />
      ))}
    </span>
  );
}
