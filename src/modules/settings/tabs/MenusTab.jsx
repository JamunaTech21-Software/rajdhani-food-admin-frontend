import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../../components/data/SortableList.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { useConfirm } from "../../../components/ui/confirm-context.js";
import { Skeleton } from "../../../components/ui/Skeleton.jsx";
import { useToast } from "../../../components/ui/toast-context.js";
import { api } from "../../../lib/api.js";
import { asTree, groupByLocation, MENU_LOCATIONS } from "../menuLocations.js";
import { MenuLinkDialog } from "../MenuLinkDialog.jsx";

const QUERY_KEY = ["admin", "menu-links"];

function LinkRow({ link, depth = 0, onEdit, onDelete }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {depth > 0 ? (
        <CornerDownRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="shrink-0 text-ink-subtle"
        />
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{link.label}</span>
          {link.is_active ? null : <Badge tone="neutral">Hidden</Badge>}
          {link.open_in_new_tab ? (
            <ExternalLink size={12} strokeWidth={1.75} aria-label="Opens in a new tab" className="text-ink-subtle" />
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ink-muted">{link.url}</span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(link)}
          aria-label={`Edit ${link.label}`}
          className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
        >
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(link)}
          aria-label={`Delete ${link.label}`}
          className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
        >
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </span>
    </span>
  );
}

export function MenusTab() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [newLocation, setNewLocation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/menu-links"),
  });

  const links = data?.items ?? [];
  const grouped = groupByLocation(links);

  const reorder = useMutation({
    mutationFn: ({ location, ids }) => api.patch("/admin/menu-links/reorder", { location, ids }),
    onMutate: async ({ location, ids }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData(QUERY_KEY);

      queryClient.setQueryData(QUERY_KEY, (current) => {
        if (!current) return current;
        const position = new Map(ids.map((id, index) => [id, index + 1]));
        return {
          ...current,
          items: current.items.map((link) =>
            link.location === location && position.has(link.id)
              ? { ...link, sort_order: position.get(link.id) }
              : link,
          ),
        };
      });

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error("Could not save the new order", error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/menu-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Link removed");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(link) {
    const children = links.filter((candidate) => candidate.parent_id === link.id);
    const confirmed = await confirm({
      title: `Delete “${link.label}”?`,
      description:
        children.length > 0
          ? `${children.length} link${children.length === 1 ? "" : "s"} nested under this one will be left without a parent and move up to the top level.`
          : "It disappears from the site on the next page load.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) remove.mutate(link.id);
  }

  function openNew(location) {
    setEditing(null);
    setNewLocation(location);
    setDialogOpen(true);
  }

  function openEdit(link) {
    setEditing(link);
    setNewLocation(null);
    setDialogOpen(true);
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading menus" aria-busy="true" className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-ink-muted">
        Menus are read live by the customer site — there is no cache to wait out, so an edit here is
        visible on its next page load.
      </p>

      {MENU_LOCATIONS.map((location) => {
        const inLocation = grouped.get(location.value) ?? [];
        const tree = asTree(inLocation);

        return (
          <Card key={location.value}>
            <CardHeader
              title={location.label}
              description={location.description}
              action={
                <Button variant="secondary" size="sm" onClick={() => openNew(location.value)}>
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                  Add
                </Button>
              }
            />

            {tree.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Nothing here yet.</p>
            ) : (
              <SortableList
                items={tree}
                onReorder={(next) =>
                  reorder.mutate({ location: location.value, ids: next.map((l) => l.id) })
                }
                className="divide-y divide-line"
              >
                {(link) => (
                  <SortableRow key={link.id} id={link.id} className="px-4 py-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <LinkRow link={link} onEdit={openEdit} onDelete={handleDelete} />

                      {link.children?.length ? (
                        <span className="flex flex-col gap-2 border-l border-line pl-4">
                          {link.children.map((child) => (
                            <LinkRow
                              key={child.id}
                              link={child}
                              depth={1}
                              onEdit={openEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </SortableRow>
                )}
              </SortableList>
            )}
          </Card>
        );
      })}

      <MenuLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        link={editing}
        location={newLocation}
        allLinks={links}
      />
    </div>
  );
}
