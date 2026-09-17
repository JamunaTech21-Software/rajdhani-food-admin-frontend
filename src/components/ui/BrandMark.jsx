/**
 * The Rajdhani leaf, as a component.
 *
 * The same geometry as `public/favicon.svg`, but drawn in tokens rather than
 * the three hex values baked into that file — so it follows `primary_color`
 * like everything else (§18.2). Inline rather than an `<img>`: a mark that has
 * to be recoloured at runtime cannot be a file, and it saves a request on the
 * one screen that has nothing else to show while it loads.
 *
 * `title` makes it an image with a name; omit it and it is decorative, which is
 * the right answer when it sits beside the word "Rajdhani" anyway.
 */
export function BrandMark({ size = 40, title, className, rounded = true }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {rounded ? <rect width="32" height="32" rx="7" fill="var(--color-brand)" /> : null}

      <path
        d="M23.5 8.2c0 7.6-4.3 12.4-10.6 12.4-1.2 0-2.3-.16-3.2-.47C9.2 16.3 12 12 17 10.2c-4.6.9-7.6 4.3-8.6 8.6-1.3-1.5-1.9-3.4-1.9-5.3 0-4.2 3.6-6.1 8.2-6.4 2.7-.2 5.6-.1 7.5-1.2.2.7.3 1.5.3 2.3Z"
        fill={rounded ? "var(--color-brand-tint)" : "currentColor"}
      />
      <path
        d="M13.2 19.9C13.6 22.4 13.4 24 12.6 25.5"
        stroke={rounded ? "var(--color-gold)" : "currentColor"}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
