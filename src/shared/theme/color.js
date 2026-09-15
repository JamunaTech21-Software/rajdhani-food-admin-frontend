// sRGB <-> OKLab. Derived shades are computed here rather than with CSS
// `oklch(from ...)` because §14.5 requires iOS Safari 15, which supports neither
// relative colour syntax nor oklch() values.

const clamp01 = (n) => Math.min(1, Math.max(0, n));

export function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }) {
  const to = (c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }) {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

export function oklchToRgb({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return {
    r: clamp01(toGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)),
    g: clamp01(toGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)),
    b: clamp01(toGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_)),
  };
}

/** Re-render a colour at a new OKLab lightness, optionally scaling chroma. */
export function shade(hex, lightness, chromaScale = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { c, h } = rgbToOklch(rgb);
  return rgbToHex(oklchToRgb({ l: clamp01(lightness), c: c * chromaScale, h }));
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pick whichever foreground clears AA against `background`.
 * site_profile lets an admin choose any brand colour, so a fixed white
 * foreground would silently drop below 4.5:1 on a pale one.
 */
export function readableOn(background, light = "#FFFFFF", dark = "#1A1A1A") {
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}
