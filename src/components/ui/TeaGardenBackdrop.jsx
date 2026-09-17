import { useId } from "react";

/**
 * Rolling slopes, contour rows and a band of morning mist — a tea garden at the
 * level of a suggestion rather than a picture of one.
 *
 * The brief was "feeling like a tea garden but not totally a tea garden", and
 * the line between those is literalness. A photograph of an estate, or a field
 * of drawn leaves, makes a sign-in screen into a poster. What actually carries
 * the association is the *shape* of the place: hills receding into haze, and the
 * curved parallel rows of contour planting that no other kind of farmland has.
 * Rendered as plain geometry, at low contrast, they read as atmosphere — you
 * notice the mood before you notice what it is.
 *
 * Three slopes, far to near, each a little darker and a little more defined,
 * which is what distance does to a hillside. The contour rows sit on the middle
 * slope only, clipped to it so they cannot stray into the sky, and at a few
 * percent opacity: enough to be felt, not enough to be counted.
 *
 * Every fill is a `var(--color-*)`, so a client who rebrands gets re-toned hills
 * rather than a patch of the old green (§18.2).
 *
 * Bottom-anchored with `slice`, so the curves keep their shape at every width
 * and the crop takes the sides instead of flattening them.
 */
export function TeaGardenBackdrop({ className }) {
  const uid = useId();
  const slopeClip = `${uid}-slope`;
  const mistFade = `${uid}-mist`;

  return (
    <svg
      viewBox="0 0 1440 420"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <clipPath id={slopeClip}>
          <path d={MIDDLE} />
        </clipPath>

        {/* The haze that collects in the fold between slopes at first light —
            opaque where the hills meet, gone a third of the way up. */}
        <linearGradient id={mistFade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-on-brand)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--color-on-brand)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--color-on-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={FAR} fill="var(--color-brand-muted)" opacity="0.38" />

      <rect x="0" y="150" width="1440" height="150" fill={`url(#${mistFade})`} />

      <path d={MIDDLE} fill="var(--color-brand)" opacity="0.55" />

      <g clipPath={`url(#${slopeClip})`} stroke="var(--color-on-brand)" fill="none" opacity="0.07">
        {CONTOURS.map((d, index) => (
          <path key={d} d={d} strokeWidth={index % 2 ? 1 : 1.5} />
        ))}
      </g>

      <path d={NEAR} fill="var(--color-brand-deep)" opacity="0.92" />
    </svg>
  );
}

// The slopes. Long, shallow curves — a tea hillside is rounded, not alpine, and
// a sharp peak anywhere here would read as a mountain range instead.
const FAR =
  "M0 196 C 190 140 330 232 528 192 S 906 120 1122 178 S 1348 212 1440 186 L1440 420 L0 420 Z";

const MIDDLE =
  "M0 258 C 206 204 388 292 624 252 S 986 200 1208 258 S 1382 278 1440 256 L1440 420 L0 420 Z";

const NEAR =
  "M0 330 C 246 282 448 352 706 322 S 1086 286 1296 332 S 1402 346 1440 336 L1440 420 L0 420 Z";

/**
 * Contour rows, following the middle slope's own curve at widening intervals.
 *
 * They fan apart as they come down the hill because that is what perspective
 * does to parallel rows — evenly spaced lines would read as a graph.
 */
const CONTOURS = [18, 40, 68, 102, 142, 190].map(
  (drop) =>
    `M-20 ${258 + drop} C 206 ${204 + drop} 388 ${292 + drop} 624 ${252 + drop} S 986 ${200 + drop} 1208 ${258 + drop} S 1382 ${278 + drop} 1460 ${256 + drop}`,
);
