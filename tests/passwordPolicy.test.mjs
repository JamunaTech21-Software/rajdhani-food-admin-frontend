import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  checkPassword,
  isPolicyCompliant,
  MIN_LENGTH,
  passwordLength,
  RULES,
  rulesMet,
  unmetRules,
} from "../src/lib/passwordPolicy.js";

const backend = (path) =>
  readFileSync(fileURLToPath(new URL(`../../../backend/api/${path}`, import.meta.url)), "utf8");

test("the minimum length is the one the API is configured with", () => {
  // config/auth.php. A client minimum below the API's means a form that says
  // "fine" and a request that comes back 422.
  const config = backend("config/auth.php");
  const configured = Number(config.match(/'min_length'\s*=>\s*(\d+)/)?.[1]);

  assert.equal(MIN_LENGTH, configured);
});

test("all four character requirements are switched on server-side", () => {
  // If the API relaxed one, this checklist would demand more than it enforces
  // and turn away passwords the API would have taken.
  const config = backend("config/auth.php");

  for (const requirement of ["require_upper", "require_lower", "require_digit", "require_symbol"]) {
    assert.match(
      config,
      new RegExp(`'${requirement}'\\s*=>\\s*true`),
      `${requirement} is no longer required by the API`,
    );
  }
  assert.equal(RULES.length, 5, "four character rules plus length");
});

test("the rules match PasswordHelper's patterns, not ones of our own", () => {
  const helper = backend("app/Helpers/PasswordHelper.php");

  assert.match(helper, /\\p\{Lu\}/, "uppercase is \\p{Lu}");
  assert.match(helper, /\\p\{Ll\}/, "lowercase is \\p{Ll}");
  assert.match(helper, /\[\^\\p\{L\}\\p\{N\}\]/, "a symbol is anything that is not a letter or number");
  assert.match(helper, /mb_strlen/, "length is counted in characters, not bytes");
});

test("a compliant password passes every rule", () => {
  assert.equal(isPolicyCompliant("Rajdhani#2026"), true);
  assert.deepEqual(unmetRules("Rajdhani#2026"), []);
  assert.equal(rulesMet("Rajdhani#2026"), RULES.length);
});

test("each rule fails on its own", () => {
  const failing = {
    length: "Ab1#efg",          // 7 characters
    upper: "rajdhani#2026",
    lower: "RAJDHANI#2026",
    digit: "RajdhaniTea#",
    symbol: "RajdhaniTea2026",
  };

  for (const [id, password] of Object.entries(failing)) {
    const unmet = unmetRules(password).map((r) => r.id);
    assert.deepEqual(unmet, [id], `"${password}" should fail exactly the ${id} rule`);
  }
});

test("every unmet rule is reported at once, not one per attempt", () => {
  // The API returns them all together on purpose; the checklist has to as well
  // or a user fixes one problem per round-trip.
  const unmet = unmetRules("abc").map((r) => r.id);

  assert.deepEqual(unmet.sort(), ["digit", "length", "symbol", "upper"].sort());
});

test("length is counted in characters, the way mb_strlen counts", () => {
  // JavaScript's .length would call this 20 and let a short password through.
  const astral = "𝐀𝐛𝟏𝐱𝐲𝐳𝐩𝐪𝐫𝐬";
  assert.equal(astral.length, 20, "UTF-16 units — what .length would have said");
  assert.equal(passwordLength(astral), 10, "code points — what the API counts");

  assert.equal(passwordLength("আমারদেশটা"), 9, "Bangla characters count as characters");
  assert.equal(passwordLength(""), 0);
  assert.equal(passwordLength(null), 0);
});

test("a digit means an ASCII digit, because that is what the API accepts", () => {
  // PasswordHelper uses /\d/ with no unicode flag, so a Bengali digit does not
  // satisfy it there. Accepting it here would produce a 422 the form promised
  // would not happen.
  const bengaliDigits = "Rajdhani#২০২৬";

  assert.ok(
    unmetRules(bengaliDigits).some((r) => r.id === "digit"),
    "a Bengali digit must not satisfy the digit rule",
  );
});

test("a space counts as a symbol, matching the API", () => {
  // [^\p{L}\p{N}] includes whitespace. Quietly disagreeing would reject a
  // passphrase the API would have accepted.
  assert.equal(isPolicyCompliant("Rajdhani Tea 2026"), true);
});

test("an uppercase letter outside A–Z still counts", () => {
  // \p{Lu}, not [A-Z].
  assert.ok(checkPassword("Ωmega-tea-2026").find((r) => r.id === "upper").met);
});

test("the checklist always returns every rule, met or not", () => {
  // It is a checklist, not an error list: a user needs to see the rules they
  // have already satisfied, not only the ones outstanding.
  for (const password of ["", "x", "Rajdhani#2026", null, undefined]) {
    const checked = checkPassword(password);
    assert.equal(checked.length, RULES.length);
    assert.ok(checked.every((r) => typeof r.met === "boolean" && r.label));
  }
});

test("an empty password satisfies nothing and does not crash", () => {
  assert.equal(isPolicyCompliant(""), false);
  assert.equal(isPolicyCompliant(null), false);
  assert.equal(isPolicyCompliant(undefined), false);
  assert.equal(rulesMet(""), 0);
});
