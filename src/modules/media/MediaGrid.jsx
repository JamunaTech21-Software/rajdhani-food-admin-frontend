import { FileText, Film } from "lucide-react";

import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";
import { formatSize } from "./folders.js";


function Thumbnail({ asset }) {
  if (asset.type === "IMAGE") {
    return (
      <img
        src={asset.secure_url}
        alt={asset.alt_text ?? ""}
        loading="lazy"
        className="size-full object-cover"
      />
    );
  }

  const Glyph = asset.type === "VIDEO" ? Film : FileText;
  return (
    <span className="grid size-full place-items-center text-ink-subtle">
      <Glyph size={24} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

/**
 * The asset grid, shared by the library screen and the picker so the two cannot
 * drift — the picker is meant to be the library, narrowed to a choice.
 */
export function MediaGrid({ assets, isPending, selectedId, onSelect, emptyState, columns = "grid" }) {
  if (isPending) {
    return (
      <div role="status" aria-label="Loading media" aria-busy="true" className={GRID[columns]}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!assets?.length) return emptyState ?? null;

  return (
    <ul className={GRID[columns]}>
      {assets.map((asset) => {
        const selected = asset.id === selectedId;

        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => onSelect(asset)}
              aria-pressed={selected}
              className={cn(
                "group block w-full overflow-hidden rounded-md border text-left",
                "transition-colors duration-(--duration-fast)",
                selected
                  ? "border-brand ring-2 ring-brand"
                  : "border-line hover:border-line-strong",
              )}
            >
              <span className="block aspect-square overflow-hidden bg-ground">
                <Thumbnail asset={asset} />
              </span>

              <span className="block px-2 py-1.5">
                <span
                  className={cn(
                    "block truncate text-xs",
                    asset.alt_text ? "text-ink" : "italic text-ink-subtle",
                  )}
                >
                  {asset.alt_text || "No alt text"}
                </span>
                <span className="block truncate text-[0.65rem] text-ink-subtle">
                  {asset.format?.toUpperCase()} · {formatSize(asset.bytes ?? 0)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const GRID = {
  grid: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  picker: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
};
