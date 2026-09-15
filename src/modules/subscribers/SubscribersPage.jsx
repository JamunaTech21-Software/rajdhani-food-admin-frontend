import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { DataTable } from "../../components/data/DataTable.jsx";
import { Pagination } from "../../components/data/Pagination.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { downloadCsv } from "../../lib/downloadCsv.js";
import { formatDate } from "../../lib/format.js";
import { useAuthStore } from "../../stores/authStore.js";

const LIMIT = 20;

const FILTERS = [
  { value: "", label: "Everyone" },
  { value: "true", label: "Subscribed" },
  { value: "false", label: "Unsubscribed" },
];

export function SubscribersPage() {
  const [params, setParams] = useSearchParams();
  const isSubscribed = params.get("isSubscribed") ?? "";
  const page = Number(params.get("page")) || 1;

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

  // The list and export endpoints take the same filter, which is what makes the
  // export match what is on screen rather than always dumping everyone.
  const activeFilters = { isSubscribed };

  const query = useQuery({
    queryKey: ["admin", "subscribers", { isSubscribed, page }],
    queryFn: () => api.list("/admin/subscribers", { params: { ...activeFilters, page, limit: LIMIT } }),
    placeholderData: (previous) => previous,
  });

  const exporting = useMutation({
    mutationFn: () => api.get("/admin/subscribers/export", { params: activeFilters }),
    onSuccess: (data) => {
      downloadCsv(data);
      toast.success("Export downloaded");
    },
    onError: (error) => toast.error("Could not export", error.message),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/subscribers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Subscriber removed");
    },
    onError: (error) => toast.error("Could not remove", error.message),
  });

  async function handleRemove(row) {
    const ok = await confirm({
      title: "Remove this subscriber?",
      description: `${row.email} is deleted outright. Unsubscribing is usually what you want instead — it keeps the record that they opted out.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(row.id);
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => <span className="truncate font-medium text-ink">{getValue()}</span>,
      },
      {
        accessorKey: "is_subscribed",
        header: "Status",
        meta: { width: "9rem" },
        cell: ({ row }) =>
          row.original.is_subscribed ? (
            <Badge tone="success">Subscribed</Badge>
          ) : (
            <Badge tone="neutral">Unsubscribed</Badge>
          ),
      },
      {
        accessorKey: "source",
        header: "Source",
        meta: { width: "9rem" },
        cell: ({ getValue }) => <span className="text-ink-muted">{getValue() ?? "—"}</span>,
      },
      {
        id: "dates",
        header: "Joined / left",
        meta: { width: "12rem" },
        cell: ({ row }) => (
          <span className="text-ink-muted">
            {formatDate(row.original.subscribed_at)}
            {row.original.unsubscribed_at ? ` → ${formatDate(row.original.unsubscribed_at)}` : ""}
          </span>
        ),
      },
      ...(isSuperAdmin
        ? [
            {
              id: "actions",
              header: "",
              meta: { align: "right", width: "4rem" },
              cell: ({ row }) => (
                <button
                  type="button"
                  onClick={() => handleRemove(row.original)}
                  aria-label={`Remove ${row.original.email}`}
                  className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              ),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin],
  );

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Subscribers</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {query.data?.meta ? `${query.data.meta.total} on the list` : "Newsletter sign-ups."}
          </p>
        </div>
        <Button
          variant="secondary"
          loading={exporting.isPending}
          onClick={() => exporting.mutate()}
        >
          <Download size={15} strokeWidth={1.75} aria-hidden="true" />
          {exporting.isPending ? "Preparing…" : "Export CSV"}
        </Button>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <select
            value={isSubscribed}
            onChange={(e) => update({ isSubscribed: e.target.value })}
            aria-label="Filter by subscription status"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <span className="ml-auto text-sm text-ink-subtle">
            The export covers every row matching this filter, not just this page.
          </span>
        </div>

        {query.isError ? (
          <ErrorState
            title="Could not load subscribers"
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
              emptyState={
                <EmptyState
                  icon="users"
                  title={isSubscribed ? "Nobody matches that filter" : "No subscribers yet"}
                  description="Sign-ups from the newsletter strip appear here."
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
