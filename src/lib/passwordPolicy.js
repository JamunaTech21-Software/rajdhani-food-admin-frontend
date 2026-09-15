/**
 * The §7.2 password policy, mirrored from the API.
 *
 * Transcribed rule-for-rule from `PasswordHelper::policyViolations()` and
 * `config/auth.php`. This is a *preview* of what the API will say, never the
 * authority — the API checks the same rules and is the one that matters. But it
 * has to agree: a form that says a password is fine and then gets a 422 is worse
 * than no check at all.
 *
 * The API returns every unmet rule at once, deliberately, so the screen shows a
 * checklist rather than revealing one failure per submission.
 */

// config('auth.password_policy'): min_length 10, all four requirements on.
export const MIN_LENGTH = 10;

/**
 * Counted the way the API counts.
 *
 * The API uses `mb_strlen($plain, 'UTF-8')` — code points, not bytes, so that
 * "a password of ten Bangla characters is ten characters, not thirty bytes".
 * JavaScript's `.length` counts UTF-16 units, which disagrees above the BMP;
 * spreading iterates code points and matches PHP.
 */
export const passwordLength = (password) => [...String(password ?? "")].length;

export const RULES = [
  {
    id: "length",
    label: `At least ${MIN_LENGTH} characters`,
    test: (password) => passwordLength(password) >= MIN_LENGTH,
  },
  {
    id: "upper",
    label: "An uppercase letter",
    // \p{Lu} — any uppercase letter, not just A–Z.
    test: (password) => /\p{Lu}/u.test(password ?? ""),
  },
  {
    id: "lower",
    label: "A lowercase letter",
    test: (password) => /\p{Ll}/u.test(password ?? ""),
  },
  {
    id: "digit",
    // The API uses /\d/ without the unicode flag, so this is ASCII 0–9 only —
    // a Bengali digit does not satisfy it there and must not satisfy it here.
    label: "A digit",
    test: (password) => /\d/.test(password ?? ""),
  },
  {
    id: "symbol",
    // [^\p{L}\p{N}] — anything that is neither a letter nor a number. A space
    // counts, which is intentional on the API's side and so intentional here.
    label: "A symbol",
    test: (password) => /[^\p{L}\p{N}]/u.test(password ?? ""),
  },
];

/** Every rule with whether it is currently satisfied — the checklist's data. */
export const checkPassword = (password) =>
  RULES.map(({ id, label, test }) => ({ id, label, met: test(password) }));

export const unmetRules = (password) => checkPassword(password).filter((rule) => !rule.met);

export const isPolicyCompliant = (password) => unmetRules(password).length === 0;

/**
 * How far along the password is, for a progress indicator.
 * Deliberately a count of rules met, not an entropy estimate: the API's rules
 * are what gate acceptance, so showing anything else would mislead.
 */
export const rulesMet = (password) => RULES.length - unmetRules(password).length;
