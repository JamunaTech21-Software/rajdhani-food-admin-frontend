import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import { useMediaUpload } from "../media/useMediaUpload.js";

/**
 * Upload straight into a gallery category.
 *
 * The sign → upload → register half is `useMediaUpload`; this adds the step
 * that only the gallery needs — attaching the registered assets to a category
 * in one `bulk` call.
 *
 * The gallery uploads rather than picking because a gallery image *is* the
 * media it points at (`media_id` is `NOT NULL`, unlike every other optional
 * reference), so there is nothing to choose between.
 */
export function useGalleryUpload(categoryId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const uploader = useMediaUpload("gallery", "image");

  const attach = useMutation({
    mutationFn: (assets) =>
      api.post("/admin/gallery/images/bulk", {
        category_id: categoryId,
        images: assets.map((asset) => ({ media_id: asset.id })),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "gallery", "images"] }),
    onError: (error) =>
      toast.error(
        "Uploaded, but not added to the category",
        `${error.message} The files are in the media library.`,
      ),
  });

  const upload = useCallback(
    async (files) => {
      if (!categoryId) return [];

      const assets = await uploader.upload(files);
      // Whatever uploaded is already registered — attaching only what survived
      // is what keeps a partial failure from losing the successes.
      if (assets.length) await attach.mutateAsync(assets).catch(() => {});
      return assets;
    },
    [categoryId, uploader, attach],
  );

  return { ...uploader, upload, isUploading: uploader.isUploading || attach.isPending };
}
