import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { FileText, ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { MediaGrid } from "../../modules/media/MediaGrid.jsx";
import { UploadDropzone } from "../../modules/media/UploadDropzone.jsx";
import { folderPath } from "../../modules/media/folders.js";
import { useMediaUpload } from "../../modules/media/useMediaUpload.js";
import { Button } from "./Button.jsx";
import { EmptyState } from "./EmptyState.jsx";

const LIMIT = 24;

/**
 * The one image picker, used by every screen that references a media asset.
 *
 * RTPP-50's second acceptance criterion is that products, banners, gallery,
 * news, certifications and settings all use this rather than each rolling its
 * own — so it is a field-shaped component (`value` / `onChange`) that happens to
 * open a browser, not a page that happens to return something.
 *
 * `resource` decides which folder new uploads land in and which folder the grid
 * opens on, keeping the §12 convention without the caller thinking about it.
 */
export function MediaPicker({
  value,
  onChange,
  resource = "products",
  kind = "image",
  label = "Image",
  hint,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const uploader = useMediaUpload(resource, kind);

  // The chosen asset, so the trigger can show a thumbnail rather than an id.
  const current = useQuery({
    queryKey: ["admin", "media", value],
    queryFn: () => api.get(`/admin/media/${value}`),
    enabled: Boolean(value),
  });

  const list = useQuery({
    queryKey: ["admin", "media", { folder: folderPath(resource), page }],
    queryFn: () =>
      api.list("/admin/media", { params: { folder: folderPath(resource), page, limit: LIMIT } }),
    enabled: open,
    placeholderData: (previous) => previous,
  });

  // The whole asset goes along with the id: a caller building a list needs the
  // URL and alt text to render a thumbnail without a second fetch.
  function choose(asset) {
    onChange(asset.id, asset);
    setOpen(false);
  }

  const asset = current.data;
  // A PDF has no thumbnail to show, so the trigger falls back to a glyph that
  // matches what is being chosen rather than always offering an image.
  const Placeholder = kind === "raw" ? FileText : ImagePlus;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border",
            asset ? "border-line" : "border-dashed border-line-strong",
            "hover:border-brand",
          )}
        >
          {asset?.secure_url && asset.type === "IMAGE" ? (
            <img src={asset.secure_url} alt="" className="size-full object-cover" />
          ) : (
            <Placeholder size={20} strokeWidth={1.5} aria-hidden="true" className="text-ink-subtle" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              {value ? "Change" : "Choose"}
            </Button>
            {value ? (
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                Remove
              </Button>
            ) : null}
          </div>
          {hint ? <p className="mt-1.5 text-sm text-ink-muted">{hint}</p> : null}
          {asset && !asset.alt_text && kind !== "raw" ? (
            <p className="mt-1.5 text-sm text-warning">
              No alt text set — add it in the media library.
            </p>
          ) : null}
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[min(56rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-surface shadow-modal">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <Dialog.Title className="text-base font-semibold text-ink">
                  Choose {label.toLowerCase()}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                  Pick from what is already uploaded, or add something new.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="border-b border-line p-5">
              <UploadDropzone
                {...uploader}
                kind={kind}
                compact
                // Choosing straight after upload is the common case, so the
                // first new asset is selected rather than left to be hunted.
                upload={async (files) => {
                  const assets = await uploader.upload(files);
                  if (assets.length === 1) choose(assets[0]);
                }}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-5">
              <MediaGrid
                columns="picker"
                assets={list.data?.items}
                isPending={list.isPending}
                selectedId={value}
                onSelect={choose}
                emptyState={
                  <EmptyState
                    icon="image"
                    title="Nothing here yet"
                    description="Upload something above to get started."
                  />
                }
              />
            </div>

            {list.data?.meta?.totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-ink-muted">
                  Page {page} of {list.data.meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= list.data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
