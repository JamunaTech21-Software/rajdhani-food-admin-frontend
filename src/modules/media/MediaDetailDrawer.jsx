import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useConfirm } from "../../components/ui/confirm-context.js";
import { Field, Textarea } from "../../components/ui/Field.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { formatDateTime } from "../../lib/format.js";

import { conflictTables, isInUse } from "./usage.js";
import { folderLabel, formatSize } from "./folders.js";

export function MediaDetailDrawer({ assetId, open, onOpenChange, onDeleted }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [draft, setDraft] = useState({ alt_text: "", caption: "" });
  const [draftFor, setDraftFor] = useState(null);
  const [conflict, setConflict] = useState(null);

  const { data: asset, isPending } = useQuery({
    queryKey: ["admin", "media", assetId],
    queryFn: () => api.get(`/admin/media/${assetId}`),
    enabled: Boolean(assetId) && open,
  });

  // Refill when a different asset is opened, without an effect.
  if (asset && asset.id !== draftFor) {
    setDraftFor(asset.id);
    setDraft({ alt_text: asset.alt_text ?? "", caption: asset.caption ?? "" });
    setConflict(null);
  }

  const save = useMutation({
    mutationFn: (body) => api.patch(`/admin/media/${assetId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success("Saved");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.FORBIDDEN) {
        // An Editor holds OWN on media: they may edit only their own uploads.
        toast.error("Not yours to edit", "Only the admin who uploaded this, or a Super Admin, can change it.");
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/media/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      toast.success("Asset deleted");
      onDeleted?.();
      onOpenChange(false);
    },
    onError: (error) => {
      const tables = conflictTables(error);
      if (tables.length) {
        // Criterion 1: name what is using it rather than showing a bare refusal.
        setConflict(tables);
        return;
      }
      toast.error("Could not delete", error.message);
    },
  });

  /**
   * The only irreversible action in the dashboard — it removes the file from
   * Cloudinary too, so there is no undo and no copy left anywhere. It was the
   * one destructive action firing straight from its click handler.
   */
  async function handleDelete() {
    const confirmed = await confirm({
      title: "Delete this asset permanently?",
      description:
        "It is removed from Cloudinary as well as the library, so anything still pointing at its URL will break. This cannot be undone.",
      confirmLabel: "Delete permanently",
      tone: "danger",
    });
    if (confirmed) remove.mutate();
  }

  const inUse = isInUse(asset);
  const dirty =
    asset &&
    (draft.alt_text.trim() !== (asset.alt_text ?? "").trim() ||
      draft.caption.trim() !== (asset.caption ?? "").trim());

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[min(30rem,100vw)] flex-col bg-surface shadow-modal"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <Dialog.Title className="text-base font-semibold text-ink">Asset</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-5">
            {isPending || !asset ? (
              <>
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="mt-4 h-10 w-full" />
              </>
            ) : (
              <>
                <div className="overflow-hidden rounded-md border border-line bg-ground">
                  {asset.type === "IMAGE" ? (
                    <img src={asset.secure_url} alt={asset.alt_text ?? ""} className="max-h-72 w-full object-contain" />
                  ) : (
                    <p className="p-8 text-center text-sm text-ink-muted">{asset.format?.toUpperCase()} document</p>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-ink-muted">Folder</dt>
                  <dd className="text-ink">{folderLabel(asset.folder)}</dd>
                  <dt className="text-ink-muted">Type</dt>
                  <dd className="text-ink">
                    {asset.format?.toUpperCase()}
                    {asset.width ? ` · ${asset.width}×${asset.height}` : ""}
                  </dd>
                  <dt className="text-ink-muted">Size</dt>
                  <dd className="text-ink">{formatSize(asset.bytes ?? 0)}</dd>
                  <dt className="text-ink-muted">Uploaded</dt>
                  <dd className="text-ink">{formatDateTime(asset.created_at)}</dd>
                </dl>

                <a
                  href={asset.secure_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:text-brand-dark"
                >
                  Open the original
                  <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
                </a>

                <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5">
                  <Field
                    label="Alt text"
                    maxLength={255}
                    hint="Read aloud by screen readers and shown if the image fails to load."
                    value={draft.alt_text}
                    onChange={(e) => setDraft((d) => ({ ...d, alt_text: e.target.value }))}
                  />
                  <Textarea
                    label="Caption"
                    rows={2}
                    maxLength={512}
                    value={draft.caption}
                    onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                  />

                  {dirty ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        loading={save.isPending}
                        onClick={() =>
                          save.mutate({
                            alt_text: draft.alt_text.trim() || null,
                            caption: draft.caption.trim() || null,
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraft({ alt_text: asset.alt_text ?? "", caption: asset.caption ?? "" })
                        }
                      >
                        Discard
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-sm font-medium text-ink">Where it is used</p>

                  {inUse ? (
                    <>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {asset.usage.map((u) => (
                          <li key={u.table}>
                            <Badge tone="brand">
                              {u.count} {u.label}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm text-ink-muted">
                        It cannot be deleted while anything points at it — replace or remove those
                        first.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm text-ink-muted">
                      Nothing references this asset, so it can be deleted safely.
                    </p>
                  )}

                  {conflict ? (
                    <p className="mt-3 flex items-start gap-2.5 rounded-md bg-danger-tint p-3 text-sm text-danger">
                      <TriangleAlert size={17} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>
                        Still in use by <strong>{conflict.join(", ")}</strong>. Nothing was deleted.
                      </span>
                    </p>
                  ) : null}

                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-3"
                    disabled={inUse}
                    loading={remove.isPending}
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                    Delete permanently
                  </Button>
                  {inUse ? null : (
                    <p className="mt-1.5 text-sm text-ink-subtle">
                      Removes it from Cloudinary as well. This cannot be undone.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
