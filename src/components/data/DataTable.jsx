import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { cn } from "../../lib/cn.js";
import { Skeleton } from "../ui/Skeleton.jsx";

/**
 * A table over TanStack Table's core model only.
 *
 * Sorting, filtering and pagination are deliberately *not* wired to the client
 * models: §11 requires server-side pagination on every table, and mixing a
 * client row model in alongside it produces a table that sorts the current page
 * and calls it sorted.
 */
export function DataTable({ columns, data, isPending, emptyState, rowHref, className }) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isPending) {
    return (
      <div role="status" aria-label="Loading" aria-busy="true" className="p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="mb-2 h-10 w-full last:mb-0" />
        ))}
      </div>
    );
  }

  if (!data?.length) return emptyState ?? null;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-line">
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  style={header.column.columnDef.meta?.width ? { width: header.column.columnDef.meta.width } : undefined}
                  className={cn(
                    "px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle",
                    header.column.columnDef.meta?.align === "right" && "text-right",
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-line last:border-0",
                rowHref && "transition-colors duration-(--duration-fast) hover:bg-ground",
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "h-10 px-5 py-2 align-middle text-ink",
                    cell.column.columnDef.meta?.align === "right" && "text-right",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
