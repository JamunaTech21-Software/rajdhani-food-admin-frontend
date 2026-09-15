import { cn } from "../../lib/cn.js";

const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-dark",
  secondary: "bg-surface text-ink border border-line hover:bg-ground",
  ghost: "text-ink-muted hover:bg-ground hover:text-ink",
  danger: "bg-danger text-white hover:brightness-90",
};

const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  loading = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-colors duration-(--duration-fast)",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
