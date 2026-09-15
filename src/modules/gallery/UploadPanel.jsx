import { UploadDropzone } from "../media/UploadDropzone.jsx";
import { useGalleryUpload } from "./useGalleryUpload.js";

/** The shared dropzone, wired to upload into one gallery category. */
export function UploadPanel({ categoryId, disabled }) {
  const uploader = useGalleryUpload(categoryId);
  return <UploadDropzone {...uploader} disabled={disabled || !categoryId} />;
}
