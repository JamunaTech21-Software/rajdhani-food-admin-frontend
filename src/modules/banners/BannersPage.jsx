import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SortableList, SortableRow } from "../../components/data/SortableList.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Container } from "../../components/ui/Container.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { SCHEDULE_LABEL, SCHEDULE_TONE, scheduleState } from "../../lib/bannerSchedule.js";
import { formatDateTime } from "../../lib/format.js";
import { useNow } from "../../hooks/useNow.js";
import { groupByPlacement, PLACEMENT_GROUPS, PLACEMENTS, placementOf } from "./placements.js";
import { BannerFormDialog } from "./BannerFormDialog.jsx";

const QUERY_KEY = ["admin", "banners", { all: true }];

function ScheduleNote({ banner }) {
  if (banner.starts_at && banner.ends_at) {
    return `${formatDateTime(banner.starts_at)} → ${formatDateTime(banner.ends_at)}`;
  }
  if (banner.starts_at) return `From ${formatDateTime(banner.starts_at)}`;
  if (banner.ends_at) return `Until ${formatDateTime(banner.ends_at)}`;
  return "No schedule set";
}

export function BannersPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const now = useNow();

  const [editing, setEditing] = useState(null);
  const [newPlacement, setNewPlacement] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list("/admin/banners", { params: { limit: 200 } }),
  });

  const grouped = groupByPlacement(data?.items ?? []);

  const reorder = useMutation({
    mutationFn: ({ placement, ids }) => api.patch("/admin/banners/reorder", { placement, ids }),
    onMutate: async ({ placement, ids }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData(QUERY_KEY);

      queryClient.setQueryData(QUERY_KEY, (current) => {
        if (!current) return current;
        const position = new Map(ids.map((id, index) => [id, index + 1]));
        return {
          ...current,
          items: current.items.map((banner) =>
            banner.placement === placement && position.has(banner.id)
              ? { ...banner, sort_order: position.get(banner.id) }
              : banner,
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
    mutationFn: (id) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Banner deleted");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  async function handleDelete(banner) {
    const confirmed = await confirm({
      title: "Delete this banner?",
      description: banner.title
        ? `“${banner.title}” will be removed from ${placementOf(banner.placement).label}.`
        : "This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) remove.mutate(banner.id);
  }

  function openNew(placement) {
    setEditing(null);
    setNewPlacement(placement);
    setFormOpen(true);
  }

  function openEdit(banner) {
    setEditing(banner);
    setNewPlacement(null);
    setFormOpen(true);
  }

  if (isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load banners"
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
          <h1 className="text-2xl font-semibold text-ink">Banners</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Grouped by where they appear. Drag to set the order within a placement.
          </p>
        </div>
        <Button onClick={() => openNew(null)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New banner
        </Button>
      </header>

      {isPending ? (
        <div role="status" aria-label="Loading banners" aria-busy="true" className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        PLACEMENT_GROUPS.map((group) => (
          <section key={group} className="mb-8 last:mb-0">
            <h2 className="mb-3 text-eyebrow uppercase text-ink-subtle">{group}</h2>

            <div className="flex flex-col gap-4">
              {PLACEMENTS.filter((p) => p.group === group).map((placement) => {
                const banners = grouped.get(placement.value) ?? [];

                return (
                  <Card key={placement.value}>
                    <CardHeader
                      title={placement.label}
                      description={
                        placement.hint ??
                        (banners.length > 1 && !placement.slider
                          ? "Only the first published banner shows here."
                          : undefined)
                      }
                      action={
                        <Button variant="secondary" size="sm" onClick={() => openNew(placement.value)}>
                          <Plus size={14} strokeWidth={2} aria-hidden="true" />
                          Add
                        </Button>
                      }
                    />

                    {banners.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-ink-muted">
                        Nothing here yet.
                      </p>
                    ) : (
                      <SortableList
                        items={banners}
                        onReorder={(next) =>
                          reorder.mutate({
                            placement: placement.value,
                            ids: next.map((b) => b.id),
                          })
                        }
                        className="divide-y divide-line"
                      >
                        {(banner) => {
                          const state = scheduleState(banner, now);

                          return (
                            <SortableRow key={banner.id} id={banner.id} className="px-4 py-3">
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-medium text-ink">
                                    {banner.title || banner.eyebrow_text || "Untitled banner"}
                                  </span>
                                  <Badge tone={SCHEDULE_TONE[state]}>{SCHEDULE_LABEL[state]}</Badge>
                                </span>
                                <span className="mt-0.5 block truncate text-sm text-ink-muted">
                                  <ScheduleNote banner={banner} />
                                </span>
                              </span>

                              <span className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(banner)}
                                  aria-label="Edit banner"
                                  className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                                >
                                  <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(banner)}
                                  aria-label="Delete banner"
                                  className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-danger-tint hover:text-danger"
                                >
                                  <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                              </span>
                            </SortableRow>
                          );
                        }}
                      </SortableList>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <BannerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        banner={editing}
        placement={newPlacement}
      />
    </Container>
  );
}
