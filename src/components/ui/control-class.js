import { cn } from "../../lib/cn.js";

/** The shared border, background and disabled treatment for input-like controls. */
export const controlClass = (invalid) =>
  cn(
    "w-full rounded-md border bg-surface text-sm text-ink",
    "placeholder:text-ink-subtle",
    "transition-colors duration-(--duration-fast)",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-danger" : "border-line hover:border-line-strong",
  );
