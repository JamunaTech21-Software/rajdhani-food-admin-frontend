import { cn } from "../../lib/cn.js";
import { FALLBACK, REGISTRY } from "./icon-registry.js";

/**
 * Render an icon by the name the content model stores.
 *
 * A null or unrecognised name falls back to a neutral glyph rather than
 * punching a hole in the layout — editors can and do leave the field empty.
 */
export function Icon({ name, size = 20, className, ...props }) {
  const Glyph = REGISTRY[name] ?? FALLBACK;

  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

/**
 * The reference designs put every content icon on a pale circular chip — a deep
 * glyph on #D9EDD9. Both colours are tokens, so the chip follows primary_color
 * instead of being stranded on the green the PNG exports baked in.
 */
export function IconChip({ name, size = 20, className, chipClassName, ...props }) {
  return (
    <span
      className={cn(
        "inline-grid size-10 place-items-center rounded-full bg-brand-tint text-brand",
        chipClassName,
      )}
    >
      <Icon name={name} size={size} className={className} {...props} />
    </span>
  );
}
