import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Pagination } from "../../components/data/Pagination.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { Stars } from "../../components/ui/Stars.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { formatRelative } from "../../lib/format.js";
import { useAuthStore } from "../../stores/authStore.js";
import {
  bulkModerate,
  reconcile,
  selectionState,
  toggleAllOnPage,
  toggleSelected,
} from "./moderation.js";
import { RejectDialog } from "./RejectDialog.jsx";

const LIMIT = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export function ReviewsPage() {
  const [params, setParams] = useSearchParams();
  // §11: the queue is a moderation queue, so it opens on what needs moderating.
  const status = params.get("status") ?? "PENDING";
  const product = params.get("product") ?? "";
  const rating = params.get("rating") ?? "";
  const page = Number(params.get("page")) || 1;

  const [selected, setSelected] = useState(new Set());
  const [rejecting, setRejecting] = useState(null); // null | { ids }
  const now = useNow();

  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const isSuperAdmin = useAuthStore((s) => s.admin?.role) === "SUPER_ADMIN";

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const products = useQuery({
    queryKey: ["admin", "products", { all: true }],
    queryFn: () => api.list("/admin/products", { params: { limit: 200 } }),
    staleTime: 5 * 60_000,
  });

  const query = useQuery({
    queryKey: ["admin", "reviews", { status, product, rating, page }],
    queryFn: () =>
      api.list("/admin/reviews", { params: { status, product, rating, page, limit: LIMIT } }),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);

  // Ids left over from another page or filter are not actionable.
  const live = useMemo(() => reconcile(selected, rows), [selected, rows]);
  const headerState = selectionState(live, rows);

  function afterModeration(label) {
    queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    // Approving recalculates the product's rating aggregate server-side (§8.5),
    // so any cached product is now stale.
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    setSelected(new Set());
    toast.success(label);
  }

  const moderate = useMutation({
    mutationFn: ({ ids, action, reason }) =>
      bulkModerate({ ids, action, reason, request: (path, body) => api.patch(path, body) }),
    onSuccess: (result, { ids, action }) => {
      const n = result?.updated ?? ids.length;
      afterModeration(`${n} review${n === 1 ? "" : "s"} ${action === "approve" ? "approved" : "rejected"}`);
      setRejecting(null);
    },
    onError: (error) => toast.error("Could not moderate", error.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => afterModeration("Review deleted"),
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(review) {
    const ok = await confirm({
      title: "Delete this review permanently?",
      description: "This is a hard delete — it cannot be undone, and the customer is not told.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(review.id);
  }

  const selectedCount = live.size;
  const hasFilters = status !== "PENDING" || product || rating;

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Approved reviews appear on the product page and count towards its rating.
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <select
            value={status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <select
            value={product}
            onChange={(e) => update({ product: e.target.value })}
            aria-label="Filter by product"
            className="h-10 min-w-48 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">All products</option>
            {(products.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={rating}
            onChange={(e) => update({ rating: e.target.value })}
            aria-label="Filter by rating"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Reset
            </Button>
          ) : null}
        </div>

        {/* The bulk bar replaces the header row rather than sitting above it, so
            the selection count and its actions are never scrolled apart. */}
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-tint px-4 py-2.5">
            <p className="text-sm font-medium text-brand">
              {selectedCount} selected
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                loading={moderate.isPending && moderate.variables?.action === "approve"}
                onClick={() => moderate.mutate({ ids: [...live], action: "approve" })}
              >
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejecting({ ids: [...live] })}>
                <X size={14} strokeWidth={2.5} aria-hidden="true" />
                Reject
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        ) : rows.length > 0 ? (
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <input
              type="checkbox"
              aria-label="Select all on this page"
              checked={headerState === "all"}
              // A block body, not an expression: React 19 treats a ref
              // callback's return value as a cleanup function.
              ref={(el) => {
                if (el) el.indeterminate = headerState === "some";
              }}
              onChange={() => setSelected(toggleAllOnPage(live, rows))}
              className="size-4 accent-[var(--color-brand)]"
            />
            <span className="text-sm text-ink-muted">Select all on this page</span>
          </div>
        ) : null}

        {query.isError ? (
          <ErrorState
            title="Could not load reviews"
            action={
              <Button variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : query.isPending ? (
          <div role="status" aria-label="Loading reviews" aria-busy="true" className="p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-24 w-full last:mb-0" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title={status === "PENDING" ? "Nothing awaiting moderation" : "No reviews match"}
            description={
              status === "PENDING"
                ? "New customer reviews land here before they go live."
                : "Try a different status, product or rating."
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((review) => (
              <li
                key={review.id}
                className={cn(
                  "flex gap-3 px-4 py-4",
                  live.has(review.id) && "bg-brand-tint/40",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={`Select review by ${review.customer?.name ?? "customer"}`}
                  checked={live.has(review.id)}
                  onChange={() => setSelected(toggleSelected(live, review.id))}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    <StatusBadge status={review.status} />
                    <span className="text-sm text-ink-subtle">
                      {formatRelative(review.created_at, now)}
                    </span>
                  </div>

                  {review.title ? (
                    <p className="mt-1.5 text-sm font-medium text-ink">{review.title}</p>
                  ) : null}
                  <p className="mt-0.5 whitespace-pre-line text-sm text-ink">{review.comment}</p>

                  <p className="mt-1.5 text-sm text-ink-muted">
                    {review.customer?.name}
                    {review.customer?.email ? ` · ${review.customer.email}` : ""}
                    {review.product?.name ? ` · on ${review.product.name}` : ""}
                  </p>

                  {review.status === "REJECTED" && review.rejection_reason ? (
                    <p className="mt-1.5 rounded-md bg-danger-tint px-2.5 py-1.5 text-sm text-danger">
                      Rejected: {review.rejection_reason}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {review.status !== "APPROVED" ? (
                    <Button
                      size="sm"
                      onClick={() => moderate.mutate({ ids: [review.id], action: "approve" })}
                    >
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      Approve
                    </Button>
                  ) : null}

                  {review.status !== "REJECTED" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRejecting({ ids: [review.id] })}
                    >
                      <X size={14} strokeWidth={2.5} aria-hidden="true" />
                      Reject
                    </Button>
                  ) : null}

                  {/* Hard delete is Super Admin only — stricter than the WRITE
                      an Editor holds on reviews, so it is a role check. */}
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(review)}
                      aria-label="Delete review permanently"
                      className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
      </Card>

      <RejectDialog
        open={rejecting !== null}
        onOpenChange={(next) => !next && setRejecting(null)}
        count={rejecting?.ids.length ?? 1}
        isPending={moderate.isPending}
        onConfirm={(reason) => moderate.mutate({ ids: rejecting.ids, action: "reject", reason })}
      />
    </Container>
  );
}
