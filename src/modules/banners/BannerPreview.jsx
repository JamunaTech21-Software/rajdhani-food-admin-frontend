import { ImageOff } from "lucide-react";

/**
 * Roughly how the banner reads on the site.
 *
 * Deliberately "roughly": this is a proportional sketch, not the real hero. It
 * exists so an editor can see the relationship between eyebrow, the two-tone
 * headline, subtext and the CTAs before publishing — which is exactly what
 * RTPP-42's acceptance criterion asks it to reflect.
 *
 * The background is a placeholder rather than the real image: the admin banner
 * payload returns `desktop_image_id` only, while `PublicBanner` expands
 * `desktop_image: { url, alt }`. Raised with the backend.
 */
export function BannerPreview({ values }) {
  const {
    eyebrow_text: eyebrow,
    title,
    title_highlight: highlight,
    subtitle,
    primary_cta_label: primaryLabel,
    secondary_cta_label: secondaryLabel,
    overlay_opacity: overlay,
  } = values ?? {};

  const opacity = Math.min(100, Math.max(0, Number(overlay) || 0)) / 100;
  const isEmpty = !eyebrow && !title && !highlight && !subtitle && !primaryLabel && !secondaryLabel;

  return (
    <div>
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-lg bg-brand-muted">
        {/* Stand-in for the artwork. */}
        <div className="absolute inset-0 grid place-items-center text-on-brand/40">
          <ImageOff size={28} strokeWidth={1.5} aria-hidden="true" />
        </div>

        {/* The overlay the editor controls, left-dense as in the designs. */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-brand-deep to-transparent"
          style={{ opacity }}
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-center gap-1.5 p-5 sm:p-7">
          {eyebrow ? (
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-gold sm:text-eyebrow">
              {eyebrow}
            </p>
          ) : null}

          {title || highlight ? (
            <p className="max-w-[70%] text-lg font-semibold leading-tight text-white sm:text-2xl">
              {title}
              {title && highlight ? <br /> : null}
              {highlight ? <span className="text-gold">{highlight}</span> : null}
            </p>
          ) : null}

          {subtitle ? (
            <p className="line-clamp-2 max-w-[60%] text-xs text-white/85 sm:text-sm">{subtitle}</p>
          ) : null}

          {primaryLabel || secondaryLabel ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {primaryLabel ? (
                <span className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-on-brand">
                  {primaryLabel}
                </span>
              ) : null}
              {secondaryLabel ? (
                <span className="rounded-md border border-white/70 px-3 py-1.5 text-xs font-medium text-white">
                  {secondaryLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {isEmpty ? (
            <p className="text-sm text-white/70">
              Fill in the fields to see the banner take shape.
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-subtle">
        A proportional sketch. The real hero uses the uploaded artwork and the site’s display
        typeface.
      </p>
    </div>
  );
}
