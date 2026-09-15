import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui/Button.jsx";
import { formatNumber } from "../../lib/format.js";

/**
 * Server-side pagination (§11): the table never holds more than one page, so
 * the controls report the server's `meta` rather than a client-side row count.
 */
export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, limit, total, totalPages } = meta;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-sm text-ink-muted">
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
          Previous
        </Button>

        <span className="px-1 text-sm text-ink-muted" aria-current="page">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
