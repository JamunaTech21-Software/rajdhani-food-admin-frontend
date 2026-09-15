/**
 * Folder conventions and file screening — plain logic, no React and no API
 * client, so it can be tested directly and imported from anywhere.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const DOCUMENT_TYPES = ["application/pdf"];

// §12: images up to 5 MB, documents up to 20 MB.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/**
 * The `rajdhani/{resource}` folders from §12. Assets are never nested deeper
 * than one segment, which is why the API's `folder` filter is an exact match.
 */
export const FOLDERS = [
  { resource: "products", label: "Products" },
  { resource: "banners", label: "Banners" },
  { resource: "gallery", label: "Gallery" },
  { resource: "news", label: "News" },
  { resource: "certifications", label: "Certifications" },
  // §12 gives its list as examples, not an enum, and the signature endpoint
  // sanitises whatever segment it is handed — so content that owns images gets
  // its own folder rather than being dumped in someone else's.
  { resource: "sections", label: "Sections" },
  { resource: "pages", label: "Page content" },
  { resource: "documents", label: "Documents", kind: "raw" },
];

export const folderPath = (resource) => `rajdhani/${resource}`;

export const folderLabel = (folder) =>
  FOLDERS.find((f) => folderPath(f.resource) === folder)?.label ?? folder ?? "Uncategorised";

export const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

/** Reject what the API would reject anyway, before spending an upload on it. */
export function rejectionReason(file, kind = "image") {
  const accepted = kind === "raw" ? DOCUMENT_TYPES : IMAGE_TYPES;
  const limit = kind === "raw" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;

  if (!accepted.includes(file.type)) {
    return kind === "raw" ? "Only PDF documents are accepted" : "Only JPG, PNG, WebP or SVG";
  }
  if (file.size > limit) {
    return `Larger than the ${Math.round(limit / 1024 / 1024)} MB limit`;
  }
  return null;
}
