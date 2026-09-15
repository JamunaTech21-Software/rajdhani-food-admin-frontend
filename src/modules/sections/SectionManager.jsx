import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../components/data/SortableList.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";
import { inactiveBadge } from "./resources.jsx";
import { ResourceFormDialog } from "./ResourceFormDialog.jsx";
import { useSortableResource } from "./useSortableResource.js";

/**
 * The list half of a section resource: scope selector, sortable rows, and the
 * create / edit / delete actions.
 *
 * One component for all five — RTPP-44's acceptance criterion is explicitly that
 * the screens share an implementation rather than being five copies. What
 * differs between them lives in the descriptor, not here.
 */
export function SectionManager({ resource }) {
  const [scope, setScope] = useState(resource.scopes?.[0]?.value ?? null);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const confirm = useConfirm();

  const { items, isPending, isError, refetch, reorder, remove } = useSortableResource({
    endpoint: resource.endpoint,
    queryKey: resource.queryKey,
    scopeKey: resource.scopeKey,
    scope,
  });

  const activeScope = resource.scopes?.find((s) => s.value === scope);

  async function handleDelete(row) {
    const confirmed = await confirm({
      title: "Delete this item?",
      description: `“${resource.primary(row)}” will be removed from the site.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) remove.mutate(row.id);
  }

  function open(row) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div>
      {resource.scopeKey ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-ink">{resource.scopeLabel}</p>
          <div className="flex flex-wrap gap-2">
            {resource.scopes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                aria-pressed={option.value === scope}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors duration-(--duration-fast)",
                  option.value === scope
                    ? "border-brand bg-brand-tint font-medium text-brand"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {activeScope?.hint ? (
            <p className="mt-2 text-sm text-ink-muted">{activeScope.hint}</p>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={activeScope?.label ?? resource.label}
          description={resource.blurb}
          action={
            <Button variant="secondary" size="sm" onClick={() => open(null)}>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Add
            </Button>
          }
        />

        {isError ? (
          <ErrorState
            title="Could not load these items"
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : isPending ? (
          <div role="status" aria-label="Loading" aria-busy="true" className="p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-2 h-14 w-full last:mb-0" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="boxes"
            title="Nothing here yet"
            description={
              resource.scopeKey
                ? "Add the first item for this section."
                : "Add the first item to see it on the site."
            }
            action={<Button onClick={() => open(null)}>Add</Button>}
          />
        ) : (
          <SortableList
            items={items}
            onReorder={(next) => reorder.mutate(next.map((item) => item.id))}
            className="divide-y divide-line"
          >
            {(row) => (
              <SortableRow key={row.id} id={row.id} className="px-4 py-3">
                {resource.leading ? resource.leading(row) : null}

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {resource.primary(row)}
                    </span>
                    {resource.badges ? resource.badges(row) : null}
                    {inactiveBadge(row)}
                  </span>
                  {resource.secondary(row) ? (
                    <span className="mt-0.5 block truncate text-sm text-ink-muted">
                      {resource.secondary(row)}
                    </span>
                  ) : null}
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => open(row)}
                    aria-label="Edit"
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    aria-label="Delete"
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

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={resource}
        row={editing}
        scope={scope}
      />
    </div>
  );
}
