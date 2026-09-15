import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { DataTable } from "../../components/data/DataTable.jsx";
import { Pagination } from "../../components/data/Pagination.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { useNow } from "../../hooks/useNow.js";
import { api } from "../../lib/api.js";
import { downloadCsv } from "../../lib/downloadCsv.js";
import { formatRelative } from "../../lib/format.js";
import { useAuthStore } from "../../stores/authStore.js";
import { LeadDrawer } from "./LeadDrawer.jsx";
import { statusMeta } from "./leadResources.jsx";

const LIMIT = 20;

export function LeadsPage({ resource }) {
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState(null);
  const now = useNow();
  const toast = useToast();
  const me = useAuthStore((s) => s.admin);

  const status = params.get("status") ?? "";
  const filterValue = params.get(resource.filter.param) ?? "";
  const mine = params.get("mine") === "1";

  // The list and export endpoints take the same parameters, which is what makes
  // "the export respects the active filters" true rather than aspirational.
  //
  // Not memoised: the computed key defeats the React Compiler's memoisation,
  // and TanStack Query hashes the object for its key anyway, so a fresh one
  // each render costs nothing.
  const activeFilters = {
    status,
    [resource.filter.param]: filterValue,
    ...(mine && me?.id ? { assignedToId: me.id } : {}),
  };

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const page = Number(params.get("page")) || 1;

  const options = useQuery({
    queryKey: resource.filter.source.queryKey,
    queryFn: () =>
      api.list(resource.filter.source.endpoint, {
        params: { limit: 200 },
        auth: resource.filter.source.auth !== false,
      }),
    staleTime: 10 * 60_000,
  });

  const query = useQuery({
    queryKey: [...resource.queryKey, { ...activeFilters, page }],
    queryFn: () => api.list(resource.endpoint, { params: { ...activeFilters, page, limit: LIMIT } }),
    placeholderData: (previous) => previous,
  });

  const exporting = useMutation({
    mutationFn: () => api.get(`${resource.endpoint}/export`, { params: activeFilters }),
    onSuccess: (data) => {
      downloadCsv(data);
      toast.success("Export downloaded", "Opens in Excel with Bangla names intact.");
    },
    onError: (error) => toast.error("Could not export", error.message),
  });

  const rows = query.data?.items ?? [];
  const openRow = rows.find((r) => r.id === openId) ?? null;

  const columns = useMemo(
    () => [
      {
        id: "reference",
        header: "Reference",
        meta: { width: "13rem" },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setOpenId(row.original.id)}
            className="block truncate text-left font-mono text-xs font-medium text-brand hover:text-brand-dark"
          >
            {resource.reference(row.original)}
          </button>
        ),
      },
      {
        id: "who",
        header: "From",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setOpenId(row.original.id)}
            className="block min-w-0 text-left"
          >
            <span className="block truncate font-medium text-ink">{resource.title(row.original)}</span>
            <span className="block truncate text-sm text-ink-muted">
              {resource.subtitle(row.original)}
            </span>
          </button>
        ),
      },
      ...resource.columns.map((column) => ({
        id: column.key,
        header: column.label,
        cell: ({ row }) => <span className="text-ink-muted">{column.get(row.original)}</span>,
      })),
      {
        accessorKey: "status",
        header: "Status",
        meta: { width: "9rem" },
        cell: ({ getValue }) => {
          const meta = statusMeta(resource, getValue());
          return <Badge tone={meta.tone}>{meta.label}</Badge>;
        },
      },
      {
        accessorKey: "created_at",
        header: "Received",
        meta: { width: "9rem" },
        cell: ({ getValue }) => (
          <span className="text-ink-muted">{formatRelative(getValue(), now)}</span>
        ),
      },
    ],
    [resource, now],
  );

  const hasFilters = Boolean(status || filterValue || mine);

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{resource.label}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {query.data?.meta
              ? `${query.data.meta.total} in total`
              : `Leads from the ${resource.singular} form.`}
          </p>
        </div>

        <Button
          variant="secondary"
          loading={exporting.isPending}
          disabled={!rows.length && !hasFilters}
          onClick={() => exporting.mutate()}
        >
          <Download size={15} strokeWidth={1.75} aria-hidden="true" />
          {exporting.isPending ? "Preparing…" : "Export CSV"}
        </Button>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <select
            value={status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">All statuses</option>
            {resource.statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={filterValue}
            onChange={(e) => update({ [resource.filter.param]: e.target.value })}
            aria-label={`Filter by ${resource.filter.label.toLowerCase()}`}
            className="h-10 min-w-44 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">{resource.filter.allLabel}</option>
            {(options.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {resource.filter.optionLabel(item)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => update({ mine: e.target.checked ? "1" : "" })}
              className="size-4 accent-[var(--color-brand)]"
            />
            Assigned to me
          </label>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear
            </Button>
          ) : null}

          {hasFilters ? (
            <span className="ml-auto text-sm text-ink-subtle">
              The export covers every filtered row, not just this page.
            </span>
          ) : null}
        </div>

        {query.isError ? (
          <ErrorState
            title={`Could not load ${resource.label.toLowerCase()}`}
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
                  icon={resource.id === "enquiries" ? "file-text" : "handshake"}
                  title={hasFilters ? "Nothing matches those filters" : `No ${resource.label.toLowerCase()} yet`}
                  description={
                    hasFilters
                      ? "Try a different status or filter."
                      : "They will appear here as they are submitted from the site."
                  }
                />
              }
            />
            <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
          </>
        )}
      </Card>

      <LeadDrawer
        resource={resource}
        row={openRow}
        open={openRow !== null}
        onOpenChange={(next) => !next && setOpenId(null)}
      />
    </Container>
  );
}
