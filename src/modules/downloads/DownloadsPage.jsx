import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTable } from "../../components/data/DataTable.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useCan } from "../../stores/authStore.js";
import { publicDownloadPath } from "./downloadKey.js";
import { DownloadFormDialog } from "./DownloadFormDialog.jsx";
import { deleteWarning } from "./references.js";

const QUERY_KEY = ["admin", "downloads"];

/**
 * Copies the public path, since that is what an editor pastes into a banner CTA
 * or a page block. Shows a tick rather than a toast — the feedback belongs on
 * the control that was pressed.
 */
function CopyKey({ downloadKey }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicDownloadPath(downloadKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // A denied clipboard permission is not worth an error state: the key is
      // already on screen and selectable.
    }
  }

  return (
    <span className="flex items-center gap-1.5">
      <code className="truncate text-sm text-ink">{downloadKey}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Link copied" : `Copy ${publicDownloadPath(downloadKey)}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
      >
        {copied ? (
          <Check size={14} strokeWidth={2} aria-hidden="true" className="text-success" />
        ) : (
          <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

export function DownloadsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const canWrite = useCan("downloads", "write");
  // The delete warning needs to know where a key is linked from, and those live
  // on other modules. A Sales admin can read this screen but not those, so both
  // are best-effort and the confirmation says when it could not look.
  const canReadContent = useCan("content");

  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/downloads"),
  });

  const banners = useQuery({
    queryKey: ["admin", "banners", { all: true }],
    queryFn: () => api.list("/admin/banners", { params: { limit: 200 } }),
    enabled: canReadContent,
  });

  const blocks = useQuery({
    // No page_key: every block across every page, which is what a reference
    // scan needs and what the endpoint returns when the filter is omitted.
    queryKey: ["admin", "page-blocks", { all: true }],
    queryFn: () => api.list("/admin/page-blocks"),
    enabled: canReadContent,
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/downloads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Download deleted");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(download) {
    const confirmed = await confirm({
      title: `Delete “${download.title}”?`,
      description: deleteWarning(download, {
        banners: banners.data?.items,
        blocks: blocks.data?.items,
      }),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) remove.mutate(download.id);
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(download) {
    setEditing(download);
    setFormOpen(true);
  }

  const columns = [
    {
      id: "title",
      header: "Download",
      cell: ({ row }) => (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-ground text-ink-subtle">
            <FileText size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{row.original.title}</span>
              {row.original.is_active ? null : <Badge tone="neutral">Inactive</Badge>}
              {row.original.file ? null : <Badge tone="danger">No file</Badge>}
            </span>
            {row.original.description ? (
              <span className="mt-0.5 block text-sm text-ink-muted">{row.original.description}</span>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      id: "key",
      header: "Public link",
      meta: { width: "16rem" },
      cell: ({ row }) => <CopyKey downloadKey={row.original.key} />,
    },
    {
      id: "downloads",
      header: "Downloads",
      meta: { align: "right", width: "8rem" },
      cell: ({ row }) => (
        <span className="tabular-nums text-ink">
          {(row.original.download_count ?? 0).toLocaleString("en-GB")}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      meta: { align: "right", width: "6rem" },
      cell: ({ row }) =>
        canWrite ? (
          <span className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              aria-label={`Edit ${row.original.title}`}
              className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              aria-label={`Delete ${row.original.title}`}
              className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
            >
              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </span>
        ) : null,
    },
  ];

  if (isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load downloads"
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Downloads</h1>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Each download has a fixed public link. Replace the PDF whenever you like — the link
            never changes, so buttons on the site keep working.
          </p>
        </div>
        {canWrite ? (
          <Button onClick={openNew}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New download
          </Button>
        ) : null}
      </header>

      <Card>
        <DataTable
          columns={columns}
          data={data?.items}
          isPending={isPending}
          emptyState={
            <EmptyState
              icon="file-text"
              title="No downloads yet"
              description="Add a brochure or catalogue and the site can link to it straight away."
              action={
                canWrite ? (
                  <Button onClick={openNew}>
                    <Plus size={16} strokeWidth={2} aria-hidden="true" />
                    New download
                  </Button>
                ) : null
              }
            />
          }
        />
      </Card>

      <DownloadFormDialog open={formOpen} onOpenChange={setFormOpen} download={editing} />
    </Container>
  );
}
