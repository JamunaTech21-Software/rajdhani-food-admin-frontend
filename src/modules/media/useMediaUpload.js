import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";
import {
  failed,
  runBatch,
  succeeded,
  toRegisterBody,
  uploadToCloudinary,
} from "../../lib/uploadBatch.js";
import { rejectionReason } from "./folders.js";

const CONCURRENCY = 3;

/**
 * Sign once, upload each file straight to Cloudinary, register what lands.
 *
 * Stops at registration and hands back the `media_assets` rows — what happens
 * to them next is the caller's business (the gallery attaches them to a
 * category, the picker just selects one).
 *
 * One signature per batch, not per file: the signature authorises a folder and
 * a timestamp rather than a particular file, and the API rate-limits at 100
 * requests per 15 minutes. Twenty files would otherwise cost 20 signatures plus
 * 20 registrations rather than 1 plus 20.
 */
export function useMediaUpload(resource, kind = "image") {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [isUploading, setUploading] = useState(false);

  const reset = useCallback(() => setItems([]), []);

  const upload = useCallback(
    async (files) => {
      if (!resource || files.length === 0) return [];

      const accepted = [];
      const rejected = [];
      for (const file of files) {
        const reason = rejectionReason(file, kind);
        if (reason) rejected.push({ file, reason });
        else accepted.push(file);
      }

      setItems([
        ...accepted.map((file) => ({ name: file.name, size: file.size, status: "pending", progress: 0 })),
        ...rejected.map(({ file, reason }) => ({
          name: file.name,
          size: file.size,
          status: "failed",
          error: { message: reason },
        })),
      ]);

      if (accepted.length === 0) {
        toast.error("Nothing to upload", "Every file was rejected before starting.");
        return [];
      }

      setUploading(true);

      try {
        const signature = await api.post("/admin/media/signature", {
          resource,
          resource_type: kind === "raw" ? "raw" : "image",
        });

        const results = await runBatch(
          accepted,
          async (file, _index, onProgress) => {
            const cloudinary = await uploadToCloudinary({ file, signature, onProgress });
            return api.post("/admin/media", toRegisterBody(cloudinary));
          },
          {
            concurrency: CONCURRENCY,
            onUpdate: (index, state) =>
              setItems((current) => {
                const next = [...current];
                next[index] = { ...next[index], ...state };
                return next;
              }),
          },
        );

        const assets = succeeded(results).map((r) => r.value);
        const lost = failed(results).length;

        if (assets.length) queryClient.invalidateQueries({ queryKey: ["admin", "media"] });

        if (lost === 0) {
          toast.success(`${assets.length} file${assets.length === 1 ? "" : "s"} uploaded`);
        } else if (assets.length > 0) {
          // The successes are already registered — say so, or it reads as a total loss.
          toast.warning(
            `${assets.length} uploaded, ${lost} failed`,
            "The successful ones are in the library. Retry only the failures.",
          );
        } else {
          toast.error("Nothing uploaded", "Every file failed. See the list for why.");
        }

        return assets;
      } catch (error) {
        // Signing failed, not an individual upload — those are caught per file.
        toast.error("Upload could not start", error.message);
        return [];
      } finally {
        setUploading(false);
      }
    },
    [resource, kind, queryClient, toast],
  );

  return { items, isUploading, upload, reset };
}
