import { CircleCheck, CircleX, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "../../components/ui/Button.jsx";
import { cn } from "../../lib/cn.js";
import {
  DOCUMENT_TYPES,
  formatSize,
  IMAGE_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from "./folders.js";

function ProgressRow({ item }) {
  const pct = Math.round((item.progress ?? 0) * 100);

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm text-ink">{item.name}</span>
          <span className="shrink-0 text-xs text-ink-subtle">{formatSize(item.size)}</span>
        </span>

        {item.status === "failed" ? (
          <span className="mt-0.5 block text-sm text-danger">{item.error?.message}</span>
        ) : (
          <span
            className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Uploading ${item.name}`}
          >
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-(--duration-fast)",
                item.status === "done" ? "bg-success" : "bg-brand",
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
        )}
      </span>

      <span className="shrink-0">
        {item.status === "done" ? (
          <CircleCheck size={17} strokeWidth={1.75} className="text-success" aria-label="Uploaded" />
        ) : item.status === "failed" ? (
          <CircleX size={17} strokeWidth={1.75} className="text-danger" aria-label="Failed" />
        ) : (
          <span className="text-xs tabular-nums text-ink-subtle">{pct}%</span>
        )}
      </span>
    </li>
  );
}

/** Drop target plus the per-file progress list. Driven by `useMediaUpload`. */
export function UploadDropzone({ upload, items, isUploading, reset, kind = "image", disabled, compact }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const accept = (kind === "raw" ? DOCUMENT_TYPES : IMAGE_TYPES).join(",");
  const limit = kind === "raw" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;

  function handleFiles(fileList) {
    const files = [...fileList];
    if (files.length) upload(files);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed text-center transition-colors duration-(--duration-fast)",
          compact ? "p-4" : "p-6",
          dragging ? "border-brand bg-brand-tint" : "border-line",
          disabled && "opacity-60",
        )}
      >
        <Upload size={compact ? 18 : 22} strokeWidth={1.5} aria-hidden="true" className="mx-auto text-ink-subtle" />
        <p className="mt-2 text-sm text-ink">
          Drop {kind === "raw" ? "files" : "images"} here, or{" "}
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brand underline hover:text-brand-dark disabled:no-underline disabled:opacity-60"
          >
            choose files
          </button>
        </p>
        {!compact ? (
          <p className="mt-1 text-sm text-ink-muted">
            {kind === "raw" ? "PDF" : "JPG, PNG, WebP or SVG"}, up to {formatSize(limit)} each. They
            upload straight to Cloudinary.
          </p>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Clear it, or choosing the same file twice in a row does nothing.
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-md border border-line">
          <div className="flex items-center justify-between border-b border-line bg-ground px-4 py-2">
            <p className="text-sm font-medium text-ink">{isUploading ? "Uploading…" : "Last batch"}</p>
            {!isUploading ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                Clear
              </Button>
            ) : null}
          </div>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto scrollbar-slim">
            {items.map((item, index) => (
              <ProgressRow key={`${item.name}-${index}`} item={item} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
