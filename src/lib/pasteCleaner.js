/**
 * Strip the wrapper junk Word and Google Docs put around copied content.
 *
 * **This is a pre-filter, not the sanitiser.** ProseMirror re-parses whatever it
 * is given against the editor's schema and keeps only the nodes and marks that
 * schema allows, and the API sanitises again on the way in. What this handles is
 * the narrower set of things that survive schema filtering and still produce
 * wrong output — chiefly `<style>` blocks whose CSS text leaks in as visible
 * paragraphs, and Word's conditional-comment markup.
 *
 * Regex rather than DOMParser deliberately: this has to be testable outside a
 * browser, and the output is immediately re-parsed by ProseMirror, so the usual
 * "never parse HTML with regex" failure mode — producing subtly invalid
 * markup — is caught downstream rather than reaching storage.
 */

// `<style>…</style>` and `<script>…</script>`: their *text* is the problem, not
// their attributes. Dropping the tags alone would leave the CSS as body copy.
const STYLE_BLOCKS = /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi;

// Word wraps huge blocks in downlevel-revealed conditional comments.
const MSO_CONDITIONALS = /<!--\[if[\s\S]*?<!\[endif\]-->/gi;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;

// Office namespaced elements: <o:p>, <w:sdt>, <m:oMath>, <v:shape>.
const OFFICE_TAGS = /<\/?[a-z]+:[a-z-]+\b[^>]*>/gi;

// Document-level tags that carry no content.
const DOC_TAGS = /<\/?(?:html|head|body|meta|link|base|title|xml)\b[^>]*>/gi;

const STYLE_ATTR = /\s(?:style|class|lang|dir|face|bgcolor|color|align|width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">.
// Taken literally that turns an entire pasted document bold.
const GDOCS_WRAPPER = /<b\b[^>]*\bid\s*=\s*["']docs-internal-guid-[^"']*["'][^>]*>([\s\S]*?)<\/b>/gi;

// A <b>/<i> whose own style says it is not bold or italic is formatting noise.
const FALSE_EMPHASIS = /<(b|strong|i|em)\b[^>]*style\s*=\s*["'][^"']*font-(?:weight|style)\s*:\s*normal[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;

const EMPTY_INLINE = /<(span|font)\b[^>]*>\s*<\/\1>/gi;
const UNWRAP_INLINE = /<\/?(?:span|font)\b[^>]*>/gi;

/** True when the markup is Word or Google Docs output rather than plain HTML. */
export function looksLikeOfficePaste(html = "") {
  return /class=["']?Mso|<o:p|urn:schemas-microsoft-com|docs-internal-guid|<!--\[if [^>]*mso/i.test(
    html,
  );
}

export function cleanPastedHtml(html = "") {
  if (!html) return "";

  let out = html;

  // Order matters: strip style/script bodies before comments, or a <style>
  // inside a conditional comment loses its wrapper and leaks its CSS.
  out = out.replace(STYLE_BLOCKS, "");
  out = out.replace(MSO_CONDITIONALS, "");
  out = out.replace(HTML_COMMENTS, "");

  // Unwrap the Google Docs bold wrapper before anything strips its attributes,
  // since the id is what identifies it.
  out = out.replace(GDOCS_WRAPPER, "$1");
  out = out.replace(FALSE_EMPHASIS, "$2");

  out = out.replace(OFFICE_TAGS, "");
  out = out.replace(DOC_TAGS, "");

  out = out.replace(EMPTY_INLINE, "");
  out = out.replace(UNWRAP_INLINE, "");

  // Whatever survives keeps its tags but loses presentation attributes.
  out = out.replace(STYLE_ATTR, "");

  // Word leaves paragraphs holding nothing but a non-breaking space.
  out = out.replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");

  return out.replace(/\s{2,}/g, " ").trim();
}
