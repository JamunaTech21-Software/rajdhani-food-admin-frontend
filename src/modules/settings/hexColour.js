/**
 * Hex colour handling, matched to the API's `HexColour` schema.
 *
 * The pattern is transcribed from openapi.yaml rather than invented: the field
 * must reject exactly what the API rejects, or an admin gets a 422 for something
 * the form said was fine. The API's own note is that an invalid colour reaches
 * the browser as a CSS custom property and fails *silently* there, which is why
 * it is checked at both ends.
 */

export const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const isHexColour = (value) => HEX_COLOUR.test(value ?? "");

/**
 * The form `<input type="color">` accepts: six digits, no alpha.
 *
 * Returns null when there is nothing valid to show — the caller renders an
 * empty swatch rather than seeding the picker with a colour nobody chose.
 */
export function toSwatch(value) {
  if (!isHexColour(value)) return null;

  const body = value.slice(1);
  if (body.length === 3) return `#${[...body].map((c) => c + c).join("")}`;
  // An 8-digit value carries alpha, which the native swatch cannot represent.
  return `#${body.slice(0, 6)}`;
}
