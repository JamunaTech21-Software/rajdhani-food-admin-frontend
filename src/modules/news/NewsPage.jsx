import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { DataTable } from "../../components/data/DataTable.jsx";
import { Pagination } from "../../components/data/Pagination.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { SITE_URL } from "../../config.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../lib/api.js";
import { formatDateTime } from "../../lib/format.js";
import { isPubliclyVisible, NEWS_LABEL, NEWS_TONE, newsState } from "../../lib/newsSchedule.js";

const LIMIT = 20;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const status = params.get("status") ?? "";
  const search = params.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(search);
  const now = useNow();

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const query = useQuery({
    queryKey: ["admin", "news", { page, status, search }],
    queryFn: () => api.list("/admin/news", { params: { page, limit: LIMIT, status, search } }),
    placeholderData: (previous) => previous,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            to={`/news/${row.original.id}`}
            className="block truncate font-medium text-ink hover:text-brand"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: "state",
        header: "Status",
        meta: { width: "8rem" },
        cell: ({ row }) => {
          const state = newsState(row.original, now);
          return <Badge tone={NEWS_TONE[state]}>{NEWS_LABEL[state]}</Badge>;
        },
      },
      {
        accessorKey: "published_at",
        header: "Publish date",
        meta: { width: "12rem" },
        cell: ({ row }) => (
          <span className="text-ink-muted">
            {row.original.published_at ? formatDateTime(row.original.published_at) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        meta: { align: "right", width: "6rem" },
        cell: ({ row }) => (
          <span className="flex items-center justify-end gap-1">
            {/* Only a genuinely live post has something to look at — a scheduled
                one would 404 on the public site. */}
            {isPubliclyVisible(row.original, now) ? (
              <a
                href={`${SITE_URL}/news/${row.original.slug}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${row.original.title} on the site`}
                className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
              >
                <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
              </a>
            ) : null}
            <Link
              to={`/news/${row.original.id}`}
              aria-label={`Edit ${row.original.title}`}
              className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </span>
        ),
      },
    ],
    [now],
  );

  const hasFilters = Boolean(status || search);

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">News</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {query.data?.meta ? `${query.data.meta.total} post${query.data.meta.total === 1 ? "" : "s"}` : "Articles and updates."}
          </p>
        </div>
        <Link
          to="/news/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New post
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
              placeholder="Search by title"
              aria-label="Search posts by title"
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
            title="Could not load posts"
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
                <EmptyState
                  icon="file-text"
                  title={hasFilters ? "No posts match those filters" : "No posts yet"}
                  description={
                    hasFilters
                      ? "Try a different status or search term."
                      : "Write the first update for the news page."
                  }
                />
              }
            />
            <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
          </>
        )}
      </Card>
    </Container>
  );
}
