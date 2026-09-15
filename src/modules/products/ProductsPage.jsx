import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { DataTable } from "../../components/data/DataTable.jsx";
import { Pagination } from "../../components/data/Pagination.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { api } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";
import { ViewOnSiteLink } from "../../components/ui/ViewOnSiteLink.jsx";

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const LIMIT = 20;

export function ProductsPage() {
  // Filters live in the URL so a filtered view is shareable and survives a
  // reload — the same rule §10.2 sets for the public listing.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const status = params.get("status") ?? "";
  const categoryId = params.get("category_id") ?? "";
  const search = params.get("search") ?? "";

  const [searchDraft, setSearchDraft] = useState(search);

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    // Any filter change invalidates the current page number.
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const categories = useQuery({
    queryKey: ["admin", "categories", { all: true }],
    queryFn: () => api.list("/admin/categories", { params: { limit: 100 } }),
    staleTime: 5 * 60_000,
  });

  const categoryName = useMemo(() => {
    const map = new Map((categories.data?.items ?? []).map((c) => [c.id, c.name]));
    return (id) => map.get(id) ?? "—";
  }, [categories.data]);

  const query = useQuery({
    queryKey: ["admin", "products", { page, status, categoryId, search }],
    queryFn: () =>
      api.list("/admin/products", {
        params: { page, limit: LIMIT, status, category_id: categoryId, search },
      }),
    placeholderData: (previous) => previous,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <Link
            to={`/products/${row.original.id}`}
            className="flex min-w-0 items-center gap-2 font-medium text-ink hover:text-brand"
          >
            <span className="truncate">{row.original.name}</span>
            {row.original.is_featured ? (
              <Star size={13} className="shrink-0 fill-gold text-gold" aria-label="Featured" />
            ) : null}
          </Link>
        ),
      },
      {
        accessorKey: "category_id",
        header: "Category",
        cell: ({ getValue }) => <span className="text-ink-muted">{categoryName(getValue())}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { width: "7rem" },
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        meta: { width: "9rem" },
        cell: ({ getValue }) => <span className="text-ink-muted">{formatDate(getValue())}</span>,
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right", width: "6rem" },
        cell: ({ row }) => (
          <span className="flex items-center justify-end gap-1">
            {/* "View on site" only where there is something published to view. */}
            <ViewOnSiteLink
              kind="product"
              identifier={row.original.slug}
              visible={row.original.status === "PUBLISHED"}
              title={row.original.name}
              iconOnly
            />
            <Link
              to={`/products/${row.original.id}`}
              aria-label={`Edit ${row.original.name}`}
              className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </span>
        ),
      },
    ],
    [categoryName],
  );

  const hasFilters = Boolean(status || categoryId || search);

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {query.data?.meta ? `${query.data.meta.total} in total` : "Your tea catalogue."}
          </p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New product
        </Link>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ search: searchDraft });
            }}
            className="relative min-w-56 flex-1"
          >
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
              aria-hidden="true"
            />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search by name"
              aria-label="Search products by name"
              className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm"
            />
          </form>

          <select
            value={status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => update({ category_id: e.target.value })}
            aria-label="Filter by category"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">All categories</option>
            {(categories.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchDraft("");
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {query.isError ? (
          <ErrorState
            title="Could not load products"
            action={
              <Button variant="secondary" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={query.data?.items}
              isPending={query.isPending}
              rowHref
              emptyState={
                hasFilters ? (
                  <EmptyState
                    icon="package"
                    title="No products match those filters"
                    description="Try a different status, category or search term."
                  />
                ) : (
                  <EmptyState
                    icon="package"
                    title="No products yet"
                    description="Add your first tea to start building the catalogue."
                  />
                )
              }
            />
            <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
          </>
        )}
      </Card>
    </Container>
  );
}
