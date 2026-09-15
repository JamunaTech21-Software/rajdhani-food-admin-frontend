import { cn } from "../../lib/cn.js";

/**
 * The single horizontal rhythm for the whole app: one max width, one gutter.
 *
 * Every page and section uses this rather than repeating `max-w-* mx-auto px-*`,
 * so changing the measure is one edit. `--container-max` and the gutters live in
 * tokens.css alongside the rest of the scale.
 */
export function Container({ as: Tag = "div", size = "default", className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        size === "default" && "max-w-(--container-max)",
        size === "narrow" && "max-w-3xl",
        size === "wide" && "max-w-screen-2xl",
        size === "full" && "max-w-none",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
