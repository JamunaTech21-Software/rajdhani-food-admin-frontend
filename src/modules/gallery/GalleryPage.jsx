import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../components/data/SortableList.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { Icon } from "../../components/ui/Icon.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { GalleryCategoryDialog } from "./GalleryCategoryDialog.jsx";
import { InlineText } from "./InlineText.jsx";
import { UploadPanel } from "./UploadPanel.jsx";

const CATEGORIES_KEY = ["admin", "gallery", "categories"];

export function GalleryPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const [categoryId, setCategoryId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryDialog, setCategoryDialog] = useState(false);

  const categories = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => api.list("/admin/gallery/categories", { params: { limit: 100 } }),
  });

  const list = categories.data?.items ?? [];
  const active = list.find((c) => c.id === categoryId) ?? list[0] ?? null;
  const activeId = active?.id ?? null;

  const imagesKey = ["admin", "gallery", "images", activeId];
  const images = useQuery({
    queryKey: imagesKey,
    queryFn: () => api.list("/admin/gallery/images", { params: { category_id: activeId, limit: 200 } }),
    enabled: Boolean(activeId),
  });

  const rows = images.data?.items ?? [];

  const reorder = useMutation({
    mutationFn: (ids) => api.patch("/admin/gallery/images/reorder", { category_id: activeId, ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: imagesKey });
      const previous = queryClient.getQueryData(imagesKey);
      queryClient.setQueryData(imagesKey, (current) => {
        if (!current) return current;
        const byId = new Map(current.items.map((i) => [i.id, i]));
        return { ...current, items: ids.map((id) => byId.get(id)).filter(Boolean) };
      });
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(imagesKey, context.previous);
      toast.error("Could not save the new order", error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: imagesKey }),
  });

  // Inline edits save one field at a time and stay silent on success — a toast
  // per caption would be unbearable when working through a grid.
  const patchImage = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/admin/gallery/images/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: imagesKey }),
    onError: (error) => toast.error("Could not save", error.message),
  });

  const removeImage = useMutation({
    mutationFn: (id) => api.delete(`/admin/gallery/images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesKey });
      toast.success("Image removed");
    },
    onError: (error) => toast.error("Could not remove", error.message),
  });

  const removeCategory = useMutation({
    mutationFn: (id) => api.delete(`/admin/gallery/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      setCategoryId(null);
      toast.success("Category deleted");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function confirmRemoveImage(row) {
    const ok = await confirm({
      title: "Remove this image?",
      description: "It comes off the public gallery. The file stays in the media library.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) removeImage.mutate(row.id);
  }

  async function confirmRemoveCategory() {
    const ok = await confirm({
      title: `Delete “${active.name}”?`,
      description: "Its images lose their category. This cannot be undone from here.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) removeCategory.mutate(active.id);
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Gallery</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Upload images into a category, then drag to set the order they appear in.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setCategoryDialog(true);
          }}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New category
        </Button>
      </header>

      {categories.isError ? (
        <Card>
          <ErrorState
            title="Could not load gallery categories"
            action={
              <Button variant="secondary" onClick={() => categories.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : categories.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon="image"
            title="No gallery categories yet"
            description="The public gallery groups images by category — create one to begin."
            action={
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryDialog(true);
                }}
              >
                New category
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {list.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                aria-pressed={category.id === activeId}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
                  "transition-colors duration-(--duration-fast)",
                  category.id === activeId
                    ? "border-brand bg-brand-tint font-medium text-brand"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <Icon name={category.icon_name} size={15} />
                {category.name}
              </button>
            ))}
          </div>

          <Card className="mb-6">
            <CardHeader
              title={active?.name ?? "Category"}
              description={active?.description || "Drop images below to add them to this category."}
              action={
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(active);
                      setCategoryDialog(true);
                    }}
                    aria-label="Edit category"
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveCategory}
                    aria-label="Delete category"
                    className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </span>
              }
            />
            <div className="p-5">
              <UploadPanel categoryId={activeId} disabled={!activeId} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Images"
              description={
                rows.length
                  ? "Click a caption to edit it. Drag to reorder."
                  : "Nothing in this category yet."
              }
            />

            {images.isError ? (
              <ErrorState
                title="Could not load these images"
                action={
                  <Button variant="secondary" onClick={() => images.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : images.isPending ? (
              <div role="status" aria-label="Loading images" aria-busy="true" className="p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="mb-2 h-16 w-full last:mb-0" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon="image"
                title="No images yet"
                description="Upload some above and they will appear here."
              />
            ) : (
              <SortableList
                items={rows}
                onReorder={(next) => reorder.mutate(next.map((r) => r.id))}
                className="divide-y divide-line"
              >
                {(row) => (
                  <SortableRow key={row.id} id={row.id} className="items-start px-4 py-3">
                    {/* image_url appears once the admin payload expands its media
                        asset the way ProductImage already does. Until then this
                        falls back rather than rendering a broken image. */}
                    {row.image_url ? (
                      <img
                        src={row.image_url}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        className="size-14 shrink-0 rounded-md border border-line object-cover"
                      />
                    ) : (
                      <span
                        className="grid size-14 shrink-0 place-items-center rounded-md border border-line bg-ground text-ink-subtle"
                        title="No preview available — the admin payload does not include the image URL"
                      >
                        <ImageOff size={18} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1 text-sm">
                      <InlineText
                        label="title"
                        value={row.title}
                        placeholder="Add a title"
                        className="font-medium"
                        onSave={(title) => patchImage.mutate({ id: row.id, body: { title } })}
                      />
                      <InlineText
                        label="caption"
                        value={row.description}
                        placeholder="Add a caption"
                        multiline
                        className="mt-0.5 text-ink-muted"
                        onSave={(description) =>
                          patchImage.mutate({ id: row.id, body: { description } })
                        }
                      />
                    </span>

                    <button
                      type="button"
                      onClick={() => confirmRemoveImage(row)}
                      aria-label="Remove image"
                      className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </SortableRow>
                )}
              </SortableList>
            )}
          </Card>
        </>
      )}

      <GalleryCategoryDialog
        open={categoryDialog}
        onOpenChange={setCategoryDialog}
        category={editingCategory}
      />
    </Container>
  );
}
