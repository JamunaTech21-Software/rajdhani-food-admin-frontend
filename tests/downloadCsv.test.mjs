import assert from "node:assert/strict";
import { test } from "node:test";

import { hasBom, safeFilename, UTF8_BOM, withBom } from "../src/lib/downloadCsv.js";

// A row as the API would export it: a Bangla district name alongside its English
// one. This is exactly what Excel mangles without a BOM.
const BANGLA_CSV = "reference,name,district\nRDFP-DA-2026-05120,Rahim Uddin,মৌলভীবাজার\n";

test("the exported CSV opens with a UTF-8 BOM", () => {
  // RTPP-48's second acceptance criterion. Excel does not sniff encoding from
  // CSV content — without this every Bangla name arrives as mojibake.
  const out = withBom(BANGLA_CSV);

  assert.equal(out.charCodeAt(0), 0xfeff, "must begin with the BOM");
  assert.ok(out.startsWith(UTF8_BOM));
  assert.match(out, /মৌলভীবাজার/, "the Bangla text itself is untouched");
});

test("a BOM is never doubled", () => {
  // If the API starts emitting one, prepending a second would show as a stray
  // character in the first cell.
  const alreadyMarked = UTF8_BOM + BANGLA_CSV;
  const out = withBom(alreadyMarked);

  assert.equal(out, alreadyMarked);
  assert.equal(out.indexOf(UTF8_BOM, 1), -1, "only one BOM in the whole file");
});

test("hasBom distinguishes marked from unmarked", () => {
  assert.equal(hasBom(UTF8_BOM + "a,b"), true);
  assert.equal(hasBom("a,b"), false);
  assert.equal(hasBom(""), false);
});

test("the BOM encodes to the three bytes Excel looks for", () => {
  // EF BB BF. Asserting the encoded form, not just the code point, because that
  // is what actually lands in the file.
  const bytes = new TextEncoder().encode(withBom("a,b"));
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
});

test("Bangla survives the round trip through UTF-8 bytes", () => {
  const encoded = new TextEncoder().encode(withBom(BANGLA_CSV));
  const decoded = new TextDecoder("utf-8").decode(encoded);

  assert.match(decoded, /মৌলভীবাজার/);
  assert.match(decoded, /RDFP-DA-2026-05120/, "the reference number is intact");
});

test("an empty export still produces a valid marked file", () => {
  assert.equal(withBom(""), UTF8_BOM);
  assert.equal(withBom(), UTF8_BOM);
});

test("the server-supplied filename cannot escape the downloads folder", () => {
  assert.equal(safeFilename("enquiries-2026-09-13.csv"), "enquiries-2026-09-13.csv");
  assert.equal(safeFilename("../../etc/passwd"), "passwd.csv", "path segments stripped");
  assert.equal(safeFilename("C:\\Windows\\evil.csv"), "evil.csv");
  assert.equal(safeFilename('bad"name*.csv'), "badname.csv", "illegal characters removed");
});

test("a filename without an extension gains .csv", () => {
  assert.equal(safeFilename("enquiries"), "enquiries.csv");
  assert.equal(safeFilename("report.CSV"), "report.CSV", "an existing extension is left alone");
});

test("a missing or empty filename falls back rather than downloading as 'undefined'", () => {
  assert.equal(safeFilename(undefined), "export.csv");
  assert.equal(safeFilename(""), "export.csv");
  assert.equal(safeFilename("   "), "export.csv");
});
