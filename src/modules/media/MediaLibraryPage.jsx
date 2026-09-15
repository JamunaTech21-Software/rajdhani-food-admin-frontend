import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Pagination } from "../../components/data/Pagination.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { EmptyState, ErrorState } from "../../components/ui/EmptyState.jsx";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { MediaDetailDrawer } from "./MediaDetailDrawer.jsx";
import { MediaGrid } from "./MediaGrid.jsx";
import { UploadDropzone } from "./UploadDropzone.jsx";
import { FOLDERS, folderPath } from "./folders.js";
import { useMediaUpload } from "./useMediaUpload.js";

const LIMIT = 24;

export function MediaLibraryPage() {
  const [params, setParams] = useSearchParams();
  const folder = params.get("folder") ?? "";
  const type = params.get("type") ?? "";
  const page = Number(params.get("page")) || 1;

  const [openId, setOpenId] = useState(null);

  const selectedFolder = FOLDERS.find((f) => folderPath(f.resource) === folder);
  const uploadResource = selectedFolder?.resource ?? "products";
  const uploadKind = selectedFolder?.kind ?? "image";

  const uploader = useMediaUpload(uploadResource, uploadKind);

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.delete("page");
    setParams(merged, { replace: true });
  }

  const query = useQuery({
    queryKey: ["admin", "media", { folder, type, page }],
    queryFn: () => api.list("/admin/media", { params: { folder, type, page, limit: LIMIT } }),
    placeholderData: (previous) => previous,
  });

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Media library</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every file uploaded to the site. Files live in Cloudinary; this is the registry.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader
          title={`Upload to ${selectedFolder?.label ?? "Products"}`}
          description={
            folder
              ? `Files land in ${folder}.`
              : "Pick a folder below to upload somewhere other than Products."
          }
        />
        <div className="p-5">
          <UploadDropzone {...uploader} kind={uploadKind} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <button
            type="button"
            onClick={() => update({ folder: "" })}
            aria-pressed={folder === ""}
            className={chip(folder === "")}
          >
            All folders
          </button>
          {FOLDERS.map((f) => (
            <button
              key={f.resource}
              type="button"
              onClick={() => update({ folder: folderPath(f.resource) })}
              aria-pressed={folder === folderPath(f.resource)}
              className={chip(folder === folderPath(f.resource))}
            >
              {f.label}
            </button>
          ))}

          <select
            value={type}
            onChange={(e) => update({ type: e.target.value })}
            aria-label="Filter by type"
            className="ml-auto h-9 rounded-md border border-line bg-surface px-3 text-sm"
          >
            <option value="">Any type</option>
            <option value="IMAGE">Images</option>
            <option value="DOCUMENT">Documents</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>

        <div className="p-5">
          {query.isError ? (
            <ErrorState
              title="Could not load the media library"
              action={
                <Button variant="secondary" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <MediaGrid
              assets={query.data?.items}
              isPending={query.isPending}
              onSelect={(asset) => setOpenId(asset.id)}
              emptyState={
                <EmptyState
                  icon="image"
                  title={folder || type ? "Nothing in this folder" : "Nothing uploaded yet"}
                  description="Drop files above to add them."
                />
              }
            />
          )}
        </div>

        <Pagination meta={query.data?.meta} onPageChange={(next) => update({ page: String(next) })} />
      </Card>

      <MediaDetailDrawer
        assetId={openId}
        open={openId !== null}
        onOpenChange={(next) => !next && setOpenId(null)}
        onDeleted={() => setOpenId(null)}
      />
    </Container>
  );
}

const chip = (active) =>
  cn(
    "rounded-md border px-3 py-1.5 text-sm transition-colors duration-(--duration-fast)",
    active
      ? "border-brand bg-brand-tint font-medium text-brand"
      : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
  );
