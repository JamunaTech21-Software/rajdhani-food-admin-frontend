import { hexToRgb, readableOn, rgbToOklch, shade } from "./color.js";

// Absolute OKLab lightness targets, so the ramp stays usable whatever colour an
// admin picks. `Math.min` on the dark steps keeps an already-dark brand from
// being lightened into its own "dark" shade.
const DARK = 0.3;
const DEEP = 0.21;
const MUTED = 0.58;
// Calibrated against the real icon-chip background in the reference assets
// (#D9EDD9, sampled from rajdhani-website-images/aboutus/*). Deriving at these
// values reproduces it to within one channel while still following whatever
// primary_color the admin sets.
const TINT = 0.925;
const TINT_CHROMA = 0.3;

function readTheme(source) {
  const theme = source?.site?.theme ?? source?.theme ?? source ?? {};
  return {
    brand: theme.primary ?? theme.primary_color ?? null,
    gold: theme.secondary ?? theme.secondary_color ?? null,
    accent: theme.accent ?? theme.accent_color ?? null,
  };
}

/**
 * Write a site_profile theme onto CSS custom properties.
 *
 * Accepts the whole /public/layout (or /admin/site-profile) payload, its
 * `site` object, or a bare { primary, secondary, accent }. Unparseable or
 * missing colours are skipped so the tokens.css fallback survives — a bad
 * value in the database must not leave the app unpainted.
 */
export function applyTheme(source, target = document.documentElement) {
  const { brand, gold, accent } = readTheme(source);
  const set = (name, value) => value && target.style.setProperty(name, value);

  if (hexToRgb(brand)) {
    const { l } = rgbToOklch(hexToRgb(brand));
    set("--color-brand", brand);
    set("--color-brand-dark", shade(brand, Math.min(l, DARK)));
    set("--color-brand-deep", shade(brand, Math.min(l, DEEP)));
    set("--color-brand-muted", shade(brand, MUTED));
    set("--color-brand-tint", shade(brand, TINT, TINT_CHROMA));
    set("--color-on-brand", readableOn(brand));
  }

  if (hexToRgb(gold)) {
    set("--color-gold", gold);
    set("--color-gold-tint", shade(gold, TINT, TINT_CHROMA));
    set("--color-on-gold", readableOn(gold));
  }

  if (hexToRgb(accent)) set("--color-accent", accent);

  return target;
}

/** Drop every runtime override and fall back to tokens.css. */
export function resetTheme(target = document.documentElement) {
  for (const name of [
    "--color-brand",
    "--color-brand-dark",
    "--color-brand-deep",
    "--color-brand-muted",
    "--color-brand-tint",
    "--color-on-brand",
    "--color-gold",
    "--color-gold-tint",
    "--color-on-gold",
    "--color-accent",
  ]) {
    target.style.removeProperty(name);
  }
}
