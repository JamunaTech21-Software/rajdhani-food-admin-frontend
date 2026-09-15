import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../components/data/SortableList.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Icon } from "../../components/ui/Icon.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { CategoryFormDialog } from "./CategoryFormDialog.jsx";

// Categories are a short, hand-curated list that has to be ordered as a whole,
// so the page fetches all of them rather than paginating.
const QUERY_KEY = ["admin", "categories", { all: true }];

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/categories", { params: { limit: 100 } }),
  });

  const categories = data?.items ?? [];

  const reorder = useMutation({
    mutationFn: (ids) => api.patch("/admin/categories/reorder", { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData(QUERY_KEY);

      queryClient.setQueryData(QUERY_KEY, (current) => {
        if (!current) return current;
        const byId = new Map(current.items.map((item) => [item.id, item]));
        return { ...current, items: ids.map((id) => byId.get(id)).filter(Boolean) };
      });

      return { previous };
    },
    onError: (error, _ids, context) => {
      // Put the old order back rather than leaving the screen lying about it.
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast.error("Could not save the new order", error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Category deleted");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(category) {
    const confirmed = await confirm({
      title: `Delete “${category.name}”?`,
      description:
        "Products in this category will need reassigning. This cannot be undone from here.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) remove.mutate(category.id);
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category) {
    setEditing(category);
    setFormOpen(true);
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Categories</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Drag to set the order they appear in on the public filter bar.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New category
        </Button>
      </header>

      <Card>
        {isError ? (
          <ErrorState
            title="Could not load categories"
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : isPending ? (
          <div role="status" aria-label="Loading categories" aria-busy="true" className="p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="mb-2 h-14 w-full last:mb-0" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon="tags"
            title="No categories yet"
            description="Categories group your products and drive the public filter bar."
            action={<Button onClick={openNew}>New category</Button>}
          />
        ) : (
          <SortableList
            items={categories}
            onReorder={(next) => reorder.mutate(next.map((item) => item.id))}
            className="divide-y divide-line"
          >
            {(category) => (
              <SortableRow key={category.id} id={category.id} className="px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                  <Icon name={category.icon_name} size={17} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {category.name}
                  </span>
                  <span className="block truncate text-sm text-ink-muted">/{category.slug}</span>
                </span>

                {category.is_active ? null : <Badge tone="neutral">Inactive</Badge>}

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    aria-label={`Delete ${category.name}`}
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

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />
    </Container>
  );
}
