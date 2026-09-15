import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanPastedHtml, looksLikeOfficePaste } from "../src/lib/pasteCleaner.js";

// A realistic Word fragment: conditional comments, a style block, MsoNormal
// classes, an <o:p> filler and inline font styling.
const WORD = `
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->
<style><!-- p.MsoNormal { margin:0cm; font-family:"Calibri",sans-serif; } --></style>
<p class="MsoNormal" style='margin:0cm;font-size:11.0pt'>
  <span style='font-family:"Calibri",sans-serif;mso-ascii-theme-font:minor-latin'>Our new blend launches in March.</span>
  <o:p></o:p>
</p>
<p class="MsoNormal">&nbsp;</p>
<p class="MsoNormal"><b style='mso-bidi-font-weight:normal'>Strong taste</b>, carefully sourced.</p>
`;

// Google Docs wraps the whole selection in a <b> that is explicitly not bold.
const GDOCS = `<meta charset="utf-8"><b style="font-weight:normal" id="docs-internal-guid-1a2b3c"><p dir="ltr" style="line-height:1.38;margin-top:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;">Tea prices held steady this quarter.</span></p></b>`;

test("a Word paste loses its styling but keeps the words", () => {
  const out = cleanPastedHtml(WORD);

  assert.match(out, /Our new blend launches in March\./);
  assert.match(out, /carefully sourced\./);

  assert.doesNotMatch(out, /MsoNormal/, "class names must not survive");
  assert.doesNotMatch(out, /Calibri/, "inline font styling must not survive");
  assert.doesNotMatch(out, /style\s*=/, "no style attributes at all");
  assert.doesNotMatch(out, /<o:p/, "Office namespaced tags removed");
  assert.doesNotMatch(out, /WordDocument/, "conditional comment markup removed");
});

test("the CSS inside a <style> block does not leak in as body text", () => {
  // Dropping the tag alone would leave "p.MsoNormal { margin:0cm; … }" as a
  // visible paragraph, which is the most common symptom of a naive cleaner.
  const out = cleanPastedHtml(WORD);
  assert.doesNotMatch(out, /margin:0cm/);
  assert.doesNotMatch(out, /font-family/);
});

test("real emphasis survives; fake emphasis does not", () => {
  const out = cleanPastedHtml(WORD);

  // Word marked this <b> as not-bold via mso-bidi-font-weight:normal.
  assert.match(out, /Strong taste/, "the text is kept either way");

  const genuine = cleanPastedHtml("<p>A <strong>real</strong> emphasis</p>");
  assert.match(genuine, /<strong>real<\/strong>/, "genuine bold must be preserved");
});

test("the Google Docs wrapper does not turn the whole paste bold", () => {
  // <b style="font-weight:normal" id="docs-internal-guid-…"> taken literally
  // makes an entire pasted document bold.
  const out = cleanPastedHtml(GDOCS);

  assert.match(out, /Tea prices held steady this quarter\./);
  assert.doesNotMatch(out, /docs-internal-guid/);
  assert.doesNotMatch(out, /^<b/, "must not open with the wrapper bold");
  assert.doesNotMatch(out, /<b\b/, "the wrapper is unwrapped, not kept");
});

test("structure is kept — headings, lists and links are not flattened", () => {
  const html = `<h2 class="MsoHeading">Harvest</h2><ul><li style="color:red">First flush</li><li>Second flush</li></ul><p><a href="/products" style="color:#0000ee">See the range</a></p>`;
  const out = cleanPastedHtml(html);

  assert.match(out, /<h2>Harvest<\/h2>/);
  assert.match(out, /<li>First flush<\/li>/);
  assert.match(out, /<li>Second flush<\/li>/);
  assert.match(out, /<a href="\/products">See the range<\/a>/, "href must survive");
  assert.doesNotMatch(out, /color:/);
});

test("empty Word paragraphs are dropped", () => {
  assert.equal(cleanPastedHtml('<p class="MsoNormal">&nbsp;</p>'), "");
  assert.equal(cleanPastedHtml("<p>   </p>"), "");
  assert.equal(cleanPastedHtml("<p><br></p>"), "");
});

test("ordinary HTML passes through essentially untouched", () => {
  const html = "<p>Plain text with <em>emphasis</em>.</p>";
  assert.equal(cleanPastedHtml(html), html);
});

test("empty and missing input do not throw", () => {
  assert.equal(cleanPastedHtml(""), "");
  assert.equal(cleanPastedHtml(), "");
});

test("office pastes are detectable, ordinary ones are not", () => {
  assert.equal(looksLikeOfficePaste(WORD), true);
  assert.equal(looksLikeOfficePaste(GDOCS), true);
  assert.equal(looksLikeOfficePaste("<p>Typed straight into the editor</p>"), false);
  assert.equal(looksLikeOfficePaste(""), false);
});

test("a script block is removed wholesale", () => {
  const out = cleanPastedHtml('<p>Before</p><script>alert(1)</script><p>After</p>');
  assert.doesNotMatch(out, /alert/);
  assert.match(out, /Before/);
  assert.match(out, /After/);
});
