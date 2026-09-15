import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { useConfirm } from "../../../components/ui/confirm-context.js";
import { EmptyState } from "../../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../../components/ui/Skeleton.jsx";
import { useToast } from "../../../components/ui/toast-context.js";
import { api } from "../../../lib/api.js";
import { SocialLinkDialog } from "../SocialLinkDialog.jsx";

const QUERY_KEY = ["admin", "social-links"];

export function SocialTab() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/social-links"),
  });

  const links = [...(data?.items ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const reorder = useMutation({
    // Flat — unlike menu links, there is no location to scope the order to.
    mutationFn: (ids) => api.patch("/admin/social-links/reorder", { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData(QUERY_KEY);

      queryClient.setQueryData(QUERY_KEY, (current) => {
        if (!current) return current;
        const position = new Map(ids.map((id, index) => [id, index + 1]));
        return {
          ...current,
          items: current.items.map((link) =>
            position.has(link.id) ? { ...link, sort_order: position.get(link.id) } : link,
          ),
        };
      });

      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error("Could not save the new order", error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/social-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Social link removed");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(link) {
    const confirmed = await confirm({
      title: `Remove ${link.platform}?`,
      description: "The icon disappears from the header and footer on the next page load.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (confirmed) remove.mutate(link.id);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading social links" aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Social links"
          description="Shown as icons in the header and footer, in this order."
          action={
            <Button variant="secondary" size="sm" onClick={openNew}>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Add
            </Button>
          }
        />

        {links.length === 0 ? (
          <EmptyState
            icon="globe"
            title="No social links yet"
            description="Add the accounts you want linked from every page."
            action={
              <Button onClick={openNew}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Add a link
              </Button>
            }
          />
        ) : (
          <SortableList
            items={links}
            onReorder={(next) => reorder.mutate(next.map((l) => l.id))}
            className="divide-y divide-line"
          >
            {(link) => (
              <SortableRow key={link.id} id={link.id} className="px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium capitalize text-ink">
                      {link.platform}
                    </span>
                    {link.is_active ? null : <Badge tone="neutral">Hidden</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-muted">{link.url}</span>
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(link);
                      setDialogOpen(true);
                    }}
                    aria-label={`Edit ${link.platform}`}
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    aria-label={`Remove ${link.platform}`}
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </span>
              </SortableRow>
            )}
          </SortableList>
        )}
      </Card>

      <SocialLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} link={editing} />
    </div>
  );
}
